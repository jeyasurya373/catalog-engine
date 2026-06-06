import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Empty, ErrorState, Loading } from "../components/State";

export function ProductExplorer() {
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const params = useMemo(() => {
    const search = new URLSearchParams({ limit: "20" });
    if (q) search.set("q", q);
    if (brand) search.set("brand", brand);
    if (category) search.set("category", category);
    return search;
  }, [q, brand, category]);
  const { data, isLoading, error } = useQuery({ queryKey: ["products", params.toString()], queryFn: () => api.products(params) });

  return (
    <section>
      <div className="pageHeader">
        <div>
          <h1>Product Explorer</h1>
          <p>Search normalized catalog records across Amazon.in, Flipkart, and Myntra.</p>
        </div>
      </div>
      <div className="toolbar">
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search title" />
        <input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Brand" />
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          <option value="Footwear">Footwear</option>
          <option value="Mobiles">Mobiles</option>
          <option value="Clothing">Clothing</option>
          <option value="Makeup">Makeup</option>
          <option value="Audio">Audio</option>
        </select>
      </div>
      {isLoading && <Loading />}
      {error && <ErrorState error={error} />}
      {data && data.items.length === 0 && <Empty />}
      {data && data.items.length > 0 && (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Brand</th>
                <th>Category</th>
                <th>Platforms</th>
                <th>Best Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((product) => {
                const best = Math.min(...product.platforms.map((platform) => platform.price.current));
                return (
                  <tr key={product.product_id}>
                    <td><Link to={`/products/${product.product_id}`}>{product.title}</Link></td>
                    <td>{product.brand}</td>
                    <td>{product.category.l2}</td>
                    <td>{product.platforms.map((platform) => platform.name).join(", ")}</td>
                    <td>INR {best.toLocaleString("en-IN")}</td>
                    <td><span className="pill good">{product.enrichment_status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
