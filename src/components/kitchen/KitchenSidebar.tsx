import { CreditCard, Clock, ChefHat, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

export type KitchenView = "paid" | "pending" | "stock";

interface KitchenSidebarProps {
  activeView: KitchenView;
  onViewChange: (view: KitchenView) => void;
  paidCount: number;
  pendingCount: number;
  unacknowledgedCount: number;
}

const navItems = [
  {
    id: "paid" as const,
    title: "Paid Orders",
    icon: CreditCard,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
  },
  {
    id: "pending" as const,
    title: "Pending Orders",
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
  },
];

export function KitchenSidebar({
  activeView,
  onViewChange,
  paidCount,
  pendingCount,
  unacknowledgedCount,
}: KitchenSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const getCount = (id: KitchenView) => (id === "paid" ? paidCount : pendingCount);

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-primary" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="font-bold text-foreground">Kitchen</h2>
              <p className="text-xs text-muted-foreground">Order Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Orders</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = activeView === item.id;
                const count = getCount(item.id);
                const showAlert = item.id === "paid" && unacknowledgedCount > 0;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onViewChange(item.id)}
                      className={cn(
                        "w-full justify-start gap-3 py-6 transition-all",
                        isActive && item.bgColor,
                        isActive && "font-medium",
                        showAlert && "animate-pulse"
                      )}
                      tooltip={item.title}
                    >
                      <div className="relative">
                        <item.icon className={cn("w-5 h-5", isActive ? item.color : "text-muted-foreground")} />
                        {showAlert && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                        )}
                      </div>
                      {!isCollapsed && (
                        <>
                          <span className={cn(isActive && item.color)}>{item.title}</span>
                          <span
                            className={cn(
                              "ml-auto text-xs font-bold px-2 py-0.5 rounded-full",
                              isActive ? item.bgColor : "bg-muted",
                              isActive ? item.color : "text-muted-foreground"
                            )}
                          >
                            {count}
                          </span>
                        </>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default KitchenSidebar;
