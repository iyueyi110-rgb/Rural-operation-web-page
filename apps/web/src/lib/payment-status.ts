export type PaidOrderUpdate =
  | { model: "treeAdoption"; status: "active" }
  | { model: "ticketOrder"; status: "paid" }
  | { model: "unifiedOrder"; status: "paid" }

export function resolvePaidOrderUpdate(orderType: string): PaidOrderUpdate | null {
  if (orderType === "tree_adoption") {
    return { model: "treeAdoption", status: "active" }
  }
  if (orderType === "ticket_order") {
    return { model: "ticketOrder", status: "paid" }
  }
  if (orderType === "courtyard_booking" || orderType === "activity_booking") {
    return { model: "unifiedOrder", status: "paid" }
  }
  return null
}
