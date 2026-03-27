export type Message = {
  id: string;
  text: string;
  type: "log" | "restart" | "error";
};
