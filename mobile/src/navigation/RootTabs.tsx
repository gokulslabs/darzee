import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StyleSheet } from 'react-native'
import { TabGlyph } from './TabGlyph'
import { CustomerDetailScreen, CustomerListScreen, NewCustomerScreen } from '../screens/CustomerScreens'
import { InvoiceScreen, LedgerScreen, OrderDetailScreen, OrderListScreen } from '../screens/OrderScreens'
import { JobSheetScreen } from '../screens/JobSheetScreen'
import { BillScreen, CalendarScreen, ConfirmOrderScreen, ItemStatusScreen, OrderFormScreen } from '../screens/CreateFlow'
import { OutfitScreen } from '../screens/OutfitScreen'
import { ProductionScreen } from '../screens/ProductionScreen'
import { DashboardScreen, SettingsScreen, StaffScreen } from '../screens/SettingsScreens'
import { useSession } from '../state/Session'
import { palettes, tokens } from '../theme/tokens'
import type { CustomerParamList, DashboardParamList, FloorParamList, OrderParamList, SettingsParamList } from './types'

function stackOptions(theme: 'light' | 'dark') {
  const color = palettes[theme]
  return {
    headerStyle: { backgroundColor: color.paper },
    headerTintColor: color.ink,
    headerTitleStyle: { fontFamily: tokens.font.serif },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: color.paper },
  }
}

const CustomerStack = createNativeStackNavigator<CustomerParamList>()
const OrderStack = createNativeStackNavigator<OrderParamList>()
const FloorStack = createNativeStackNavigator<FloorParamList>()
const SettingsStack = createNativeStackNavigator<SettingsParamList>()
const DashboardStack = createNativeStackNavigator<DashboardParamList>()
const Tabs = createBottomTabNavigator()

function CustomerNavigator() {
  const { theme } = useSession()
  return (
    <CustomerStack.Navigator screenOptions={stackOptions(theme)}>
      <CustomerStack.Screen name="CustomerList" component={CustomerListScreen} options={{ title: 'Customers' }} />
      <CustomerStack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Customer' }} />
      <CustomerStack.Screen name="NewCustomer" component={NewCustomerScreen} options={{ title: 'Add customer' }} />
      <CustomerStack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order' }} />
      <CustomerStack.Screen name="Invoice" component={InvoiceScreen} options={{ title: 'Invoice' }} />
      <CustomerStack.Screen name="JobSheet" component={JobSheetScreen} options={{ title: 'Job sheet' }} />
    </CustomerStack.Navigator>
  )
}

function OrderNavigator() {
  const { theme } = useSession()
  return (
    <OrderStack.Navigator screenOptions={stackOptions(theme)}>
      <OrderStack.Screen name="OrderList" component={OrderListScreen} options={{ title: 'Orders' }} />
      <OrderStack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order' }} />
      <OrderStack.Screen name="Invoice" component={InvoiceScreen} options={{ title: 'Invoice' }} />
      <OrderStack.Screen name="JobSheet" component={JobSheetScreen} options={{ title: 'Job sheet' }} />
    </OrderStack.Navigator>
  )
}

function FloorNavigator() {
  const { theme } = useSession()
  return (
    <FloorStack.Navigator screenOptions={stackOptions(theme)}>
      <FloorStack.Screen name="Floor" component={ProductionScreen} options={{ headerShown: false, title: 'Home' }} />
      <FloorStack.Screen name="Outfit" component={OutfitScreen} options={{ title: 'Create order' }} />
      <FloorStack.Screen name="OrderForm" component={OrderFormScreen} options={{ title: 'Order details' }} />
      <FloorStack.Screen name="ConfirmOrder" component={ConfirmOrderScreen} options={{ title: 'Confirm order' }} />
      <FloorStack.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Calendar' }} />
      <FloorStack.Screen name="Bill" component={BillScreen} options={{ title: 'Bill' }} />
      <FloorStack.Screen name="ItemStatus" component={ItemStatusScreen} options={{ title: 'Item status' }} />
      <FloorStack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Piece' }} />
      <FloorStack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Measurements' }} />
      <FloorStack.Screen name="Invoice" component={InvoiceScreen} options={{ title: 'Balance' }} />
      <FloorStack.Screen name="JobSheet" component={JobSheetScreen} options={{ title: 'Job sheet' }} />
    </FloorStack.Navigator>
  )
}

function SettingsNavigator() {
  const { theme } = useSession()
  return (
    <SettingsStack.Navigator screenOptions={stackOptions(theme)}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} options={{ title: 'Settings' }} />
      <SettingsStack.Screen name="Staff" component={StaffScreen} options={{ title: 'Staff' }} />
      <SettingsStack.Screen name="Billing" component={LedgerScreen} options={{ title: 'Billing' }} />
      <SettingsStack.Screen name="Invoice" component={InvoiceScreen} options={{ title: 'Invoice' }} />
    </SettingsStack.Navigator>
  )
}

function DashboardNavigator() {
  const { theme } = useSession()
  return (
    <DashboardStack.Navigator screenOptions={stackOptions(theme)}>
      <DashboardStack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
    </DashboardStack.Navigator>
  )
}

export function RootTabs() {
  const { theme } = useSession()
  const color = palettes[theme]
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: color.brass,
        tabBarInactiveTintColor: color.inkFaint,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarStyle: {
          backgroundColor: color.paperRaised,
          borderTopColor: color.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 6,
        },
        tabBarIcon: ({ color, size }) => <TabGlyph name={route.name as 'Home' | 'Orders' | 'Customers' | 'Dashboard' | 'Settings'} color={color} size={size} />,
      })}
    >
      <Tabs.Screen name="Home" component={FloorNavigator} options={{ title: 'Home' }} />
      <Tabs.Screen name="Orders" component={OrderNavigator} />
      <Tabs.Screen name="Customers" component={CustomerNavigator} />
      <Tabs.Screen name="Dashboard" component={DashboardNavigator} />
      <Tabs.Screen name="Settings" component={SettingsNavigator} />
    </Tabs.Navigator>
  )
}

const styles = StyleSheet.create({
  item: { paddingTop: 2, paddingBottom: 2 },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0, marginTop: 1 },
})
