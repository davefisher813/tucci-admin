import { redirect } from "next/navigation";

// Self-registration is disabled on this internal tool. Accounts are created by
// a manager from the Accounts screen.
export default function SignupPage() {
  redirect("/login");
}
