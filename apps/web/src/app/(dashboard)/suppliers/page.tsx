import { Metadata } from "next";
import { SupplierSearch } from "./supplier-search";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Suppliers - SocialActions",
};

export default function SuppliersPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Supplier Search</h1>
        <p className="text-muted-foreground mt-1">
          Search for suppliers across all councils to see cross-council spending patterns.
        </p>
      </div>
      <SupplierSearch />
    </div>
  );
}
