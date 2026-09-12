import { redirect } from "next/navigation";

export default function GraphPage() {
  redirect("/explore?view=graph");
}
