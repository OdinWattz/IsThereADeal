from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models.models import Collection, CollectionItem, Game, User
from app.models.schemas import CollectionCreate, CollectionUpdate, CollectionOut, CollectionItemAdd, CollectionItemOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/collections", tags=["collections"])


@router.get("", response_model=List[CollectionOut])
async def get_collections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all collections for the current user."""
    result = await db.execute(
        select(Collection)
        .where(Collection.user_id == current_user.id)
        .options(selectinload(Collection.items).selectinload(CollectionItem.game).selectinload(Game.prices))
        .order_by(Collection.updated_at.desc())
    )
    collections = result.scalars().all()
    return collections


@router.post("", response_model=CollectionOut)
async def create_collection(
    collection_data: CollectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new collection."""
    # Check if collection name already exists for this user
    result = await db.execute(
        select(Collection).where(
            Collection.user_id == current_user.id,
            Collection.name == collection_data.name
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Collection with this name already exists")

    collection = Collection(
        user_id=current_user.id,
        name=collection_data.name,
        description=collection_data.description,
        is_public=collection_data.is_public,
    )
    db.add(collection)
    await db.commit()
    await db.refresh(collection)

    # Load items relationship
    await db.execute(
        select(Collection)
        .where(Collection.id == collection.id)
        .options(selectinload(Collection.items))
    )
    await db.refresh(collection)

    return collection


@router.get("/{collection_id}", response_model=CollectionOut)
async def get_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific collection by ID."""
    result = await db.execute(
        select(Collection)
        .where(Collection.id == collection_id, Collection.user_id == current_user.id)
        .options(selectinload(Collection.items).selectinload(CollectionItem.game).selectinload(Game.prices))
    )
    collection = result.scalar_one_or_none()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    return collection


@router.patch("/{collection_id}", response_model=CollectionOut)
async def update_collection(
    collection_id: int,
    collection_data: CollectionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a collection."""
    result = await db.execute(
        select(Collection).where(Collection.id == collection_id, Collection.user_id == current_user.id)
    )
    collection = result.scalar_one_or_none()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Check name uniqueness if updating name
    if collection_data.name and collection_data.name != collection.name:
        result = await db.execute(
            select(Collection).where(
                Collection.user_id == current_user.id,
                Collection.name == collection_data.name
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Collection with this name already exists")
        collection.name = collection_data.name

    if collection_data.description is not None:
        collection.description = collection_data.description
    if collection_data.is_public is not None:
        collection.is_public = collection_data.is_public

    await db.commit()
    await db.refresh(collection)

    # Load items
    await db.execute(
        select(Collection)
        .where(Collection.id == collection.id)
        .options(selectinload(Collection.items).selectinload(CollectionItem.game).selectinload(Game.prices))
    )
    await db.refresh(collection)

    return collection


@router.delete("/{collection_id}")
async def delete_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a collection."""
    result = await db.execute(
        select(Collection).where(Collection.id == collection_id, Collection.user_id == current_user.id)
    )
    collection = result.scalar_one_or_none()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    await db.delete(collection)
    await db.commit()

    return {"message": "Collection deleted successfully"}


@router.post("/{collection_id}/items", response_model=CollectionItemOut)
async def add_game_to_collection(
    collection_id: int,
    item_data: CollectionItemAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a game to a collection."""
    # Verify collection belongs to user
    result = await db.execute(
        select(Collection).where(Collection.id == collection_id, Collection.user_id == current_user.id)
    )
    collection = result.scalar_one_or_none()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Get or resolve game_id
    game_id = item_data.game_id
    if not game_id and item_data.steam_appid:
        result = await db.execute(select(Game).where(Game.steam_appid == item_data.steam_appid))
        game = result.scalar_one_or_none()
        if not game:
            # Game not in DB yet - fetch and add it
            from app.services.price_aggregator import upsert_game_and_prices
            game = await upsert_game_and_prices(db, item_data.steam_appid, include_key_resellers=False)
            if not game:
                raise HTTPException(status_code=404, detail="Game not found")
            # Commit the new game immediately so it's available for the collection item
            await db.commit()
        game_id = game.id

    if not game_id:
        raise HTTPException(status_code=400, detail="Must provide game_id or steam_appid")

    # Check if game already in collection
    result = await db.execute(
        select(CollectionItem).where(
            CollectionItem.collection_id == collection_id,
            CollectionItem.game_id == game_id
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Game already in collection")

    # Add game to collection
    item = CollectionItem(
        collection_id=collection_id,
        game_id=game_id,
        notes=item_data.notes,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    # Load game relationship with prices
    await db.execute(
        select(CollectionItem)
        .where(CollectionItem.id == item.id)
        .options(selectinload(CollectionItem.game).selectinload(Game.prices))
    )
    await db.refresh(item)

    return item


@router.delete("/{collection_id}/items/{item_id}")
async def remove_game_from_collection(
    collection_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a game from a collection."""
    # Verify collection belongs to user
    result = await db.execute(
        select(Collection).where(Collection.id == collection_id, Collection.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Collection not found")

    # Get and delete item
    result = await db.execute(
        select(CollectionItem).where(
            CollectionItem.id == item_id,
            CollectionItem.collection_id == collection_id
        )
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found in collection")

    await db.delete(item)
    await db.commit()

    return {"message": "Game removed from collection"}


@router.patch("/{collection_id}/items/{item_id}/notes")
async def update_item_notes(
    collection_id: int,
    item_id: int,
    notes: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update notes for a collection item."""
    # Verify collection belongs to user
    result = await db.execute(
        select(Collection).where(Collection.id == collection_id, Collection.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Collection not found")

    # Get and update item
    result = await db.execute(
        select(CollectionItem).where(
            CollectionItem.id == item_id,
            CollectionItem.collection_id == collection_id
        )
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found in collection")

    item.notes = notes
    await db.commit()

    return {"message": "Notes updated successfully"}
