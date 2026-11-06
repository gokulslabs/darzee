import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell.tsx'
import { SessionProvider } from './state/Session.tsx'
import { ShopProvider } from './state/ShopContext.tsx'
import {
  AddPerson,
  AnalyticsPage,
  ConfirmOrder,
  CreateOrder,
  FloorHome,
  Home,
  ItemStatusStep,
  OrderBill,
  InventoryPage,
  JobSheet,
  ModuleGrid,
  OrderBoard,
  OrderSummary,
  People,
  ShopCalendar,
  Person,
  PortfolioPage,
  ShippingPage,
  StaffPage,
} from './screens/Desk.tsx'
import { Ledger } from './screens/Ledger.tsx'
import { SettingsPage } from './screens/Settings.tsx'

export default function App() {
  return (
    <ShopProvider>
      <SessionProvider>
        <BrowserRouter>
          <Shell>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/production" element={<FloorHome />} />
              <Route path="/modules" element={<ModuleGrid />} />
              <Route path="/customers" element={<People />} />
              <Route path="/customers/new" element={<AddPerson />} />
              <Route path="/customers/:id" element={<Person />} />
              <Route path="/calendar" element={<ShopCalendar />} />
              <Route path="/orders" element={<OrderBoard />} />
              <Route path="/orders/new" element={<CreateOrder />} />
              <Route path="/orders/new/confirm" element={<ConfirmOrder />} />
              <Route path="/orders/:id" element={<OrderSummary />} />
              <Route path="/orders/:id/bill" element={<OrderBill />} />
              <Route path="/orders/:id/status" element={<ItemStatusStep />} />
              <Route path="/orders/:id/job" element={<JobSheet />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/staff" element={<StaffPage />} />
              <Route path="/ledger" element={<Ledger />} />
              <Route path="/shipping" element={<ShippingPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/dashboard" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Shell>
        </BrowserRouter>
      </SessionProvider>
    </ShopProvider>
  )
}
