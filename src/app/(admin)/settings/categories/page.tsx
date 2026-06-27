import { getServiceCategories } from "@/lib/data/category-actions";
import CategoryManager from "@/components/admin/CategoryManager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getServiceCategories();
  return <CategoryManager categories={categories} />;
}
