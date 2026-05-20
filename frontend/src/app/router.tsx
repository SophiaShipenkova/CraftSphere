import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '../widgets/layout/AppLayout'
import { CartPage } from '../pages/CartPage'
import { CatalogPage } from '../pages/CatalogPage'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { ProductPage } from '../pages/ProductPage'
import { RegisterPage } from '../pages/RegisterPage'
import { SellerCabinetPage } from '../pages/SellerCabinetPage'
import { SellerPage } from '../pages/SellerPage'
import { ServicePage } from '../pages/ServicePage'
import { StoryPage } from '../pages/StoryPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'seller', element: <SellerCabinetPage /> },
      { path: 'seller/products', element: <SellerCabinetPage /> },
      { path: 'seller/services', element: <SellerCabinetPage /> },
      { path: 'seller/events', element: <SellerCabinetPage /> },
      { path: 'search', element: <CatalogPage /> },
      { path: 'products', element: <CatalogPage /> },
      { path: 'services', element: <CatalogPage /> },
      { path: 'sellers', element: <CatalogPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'products/:id', element: <ProductPage /> },
      { path: 'services/:id', element: <ServicePage /> },
      { path: 'sellers/:id', element: <SellerPage /> },
      { path: 'stories/:id', element: <StoryPage /> }
    ]
  }
])
