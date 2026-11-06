export type CustomerParamList = {
  CustomerList: undefined
  CustomerDetail: { customerId: string }
  NewCustomer: undefined
  OrderDetail: { orderId: string }
  Invoice: { orderId: string }
  JobSheet: { orderId: string }
}

export type OrderParamList = {
  OrderList: undefined
  OrderDetail: { orderId: string }
  Invoice: { orderId: string }
  JobSheet: { orderId: string }
}

export type FloorParamList = {
  Floor: undefined
  Outfit: undefined
  OrderForm: undefined
  ConfirmOrder: undefined
  Calendar: undefined
  OrderDetail: { orderId: string }
  CustomerDetail: { customerId: string }
  Invoice: { orderId: string }
  JobSheet: { orderId: string }
  Bill: { orderId: string }
  ItemStatus: { orderId: string }
}

export type SettingsParamList = {
  SettingsHome: undefined
  Staff: undefined
  Billing: undefined
  Invoice: { orderId: string }
}

export type DashboardParamList = {
  Dashboard: undefined
}

export type LedgerParamList = {
  Ledger: undefined
  Invoice: { orderId: string }
}

export type DetailProps = {
  route: { params: { orderId: string } }
  navigation: { navigate: (screen: 'Invoice' | 'JobSheet', params: { orderId: string }) => void }
}

export type CustomerDetailProps = {
  route: { params: { customerId: string } }
  navigation: { navigate: (screen: 'OrderDetail', params: { orderId: string }) => void }
}
