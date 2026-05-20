import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { SimilarItemsPanel } from '../components/catalog/SimilarItemsPanel'
import { useBreadcrumbLabel } from '../components/layout/BreadcrumbContext'
import { ProductCartActions } from '../components/product/ProductCartActions'
import { SellerMiniCard } from '../components/product/SellerMiniCard'
import { ReviewsSection } from '../components/reviews/ReviewsSection'
import { CatalogRatingInline } from '../components/catalog/CatalogRatingInline'
import { DetailPanel } from '../components/ui/DetailPanel'
import { api, Product, resolveMediaUrl, Seller } from '../shared/api'
import { CART_UPDATED_EVENT } from '../shared/cartEvents'
import { useAuthStore } from '../store/auth'

export function ProductPage() {
  const params = useParams()
  const token = useAuthStore((s) => s.token)
  const [product, setProduct] = useState<Product | null>(null)
  const [seller, setSeller] = useState<Seller | null>(null)
  const [cartQty, setCartQty] = useState(0)
  const [activeImage, setActiveImage] = useState(0)

  useBreadcrumbLabel(params.id, product?.title)

  const loadCartQty = useCallback(
    async (productId: number) => {
      if (!token) {
        setCartQty(0)
        return
      }
      try {
        const cart = await api.cart()
        const item = cart.items.find((i) => i.product_id === productId)
        setCartQty(item?.quantity ?? 0)
      } catch {
        setCartQty(0)
      }
    },
    [token]
  )

  useEffect(() => {
    if (!params.id) return
    const id = Number(params.id)
    api.product(id).then((p) => {
      setProduct(p)
      setActiveImage(0)
      api.seller(p.seller_id).then(setSeller).catch(console.error)
      loadCartQty(id)
    }).catch(console.error)
  }, [params.id, loadCartQty])

  useEffect(() => {
    if (!product) return
    const handler = () => loadCartQty(product.id)
    window.addEventListener(CART_UPDATED_EVENT, handler)
    return () => window.removeEventListener(CART_UPDATED_EVENT, handler)
  }, [product, loadCartQty])

  if (!product) return <div className="container section card">Загрузка товара...</div>

  const images = product.images?.length ? product.images : []
  const image = images[activeImage]
  const reviewCount = product.review_count ?? 0
  const avgRating = product.avg_rating

  return (
    <div className="container section product-detail-page">
      <DetailPanel
        image={
          <div className="product-detail__gallery">
            {image ? (
              <img src={resolveMediaUrl(image)} alt={product.title} className="detail-panel__img" />
            ) : (
              <div className="product-detail__media-empty">Нет фото</div>
            )}
            {images.length > 1 && (
              <div className="product-detail__thumbs">
                {images.map((src, idx) => (
                  <button
                    key={src}
                    type="button"
                    className={`product-detail__thumb ${idx === activeImage ? 'active' : ''}`}
                    onClick={() => setActiveImage(idx)}
                  >
                    <img src={resolveMediaUrl(src)} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      >
        <h1 className="product-detail__title">{product.title}</h1>
        {product.tags.length > 0 && (
          <div className="tag-chips">
            {product.tags.map((tag) => (
              <span key={tag} className="tag-chip">
                {tag}
              </span>
            ))}
          </div>
        )}
        <h2 className="detail-subtitle">О товаре</h2>
        <p className="product-detail__description">{product.description}</p>
        {seller && <SellerMiniCard seller={seller} />}
        <div className="product-detail__commerce">
          <strong className="product-detail__price">{product.price.toLocaleString('ru-RU')} ₽</strong>
          <span className={`stock-chip ${product.stock < 1 ? 'stock-chip--out' : ''}`}>
            {product.stock > 0 ? `${product.stock} в наличии` : 'Нет в наличии'}
          </span>
          {reviewCount > 0 && avgRating != null && (
            <span className="product-detail__rating">
              <CatalogRatingInline avgRating={avgRating} starSize={18} variant="neutral" />
              <span className="product-detail__rating-reviews muted">· {reviewCount} отзывов</span>
            </span>
          )}
        </div>
        <ProductCartActions
          productId={product.id}
          stock={product.stock}
          cartQty={cartQty}
          onCartChange={setCartQty}
        />
      </DetailPanel>

      <ReviewsSection kind="product" entityId={product.id} />
      <SimilarItemsPanel kind="product" entityId={product.id} />
    </div>
  )
}
