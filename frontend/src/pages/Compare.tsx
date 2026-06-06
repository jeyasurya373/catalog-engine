import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { ErrorState, Loading } from "../components/State";

export function Compare() {
  const [ids, setIds] = useState("");
  const idList = useMemo(() => ids.split(",").map((id) => id.trim()).filter(Boolean), [ids]);
  const { data, isLoading, error } = useQuery({ queryKey: ["compare", idList], queryFn: () => api.compare(idList), enabled: idList.length > 0 });

  const bestPrice = data ? Math.min(...data.items.flatMap((product) => product.platforms.map((platform) => platform.price.current))) : null;

  return (
    <section>
      <div className="pageHeader">
        <div>
          <h1>Comparison Board</h1>
          <p>Paste comma-separated product IDs from Product Explorer.</p>
        </div>
      </div>
      <div className="toolbar">
        <input value={ids} onChange={(event) => setIds(event.target.value)} placeholder="product_id, product_id" />
      </div>
      {isLoading && <Loading />}
      {error && <ErrorState error={error} />}
      {data && (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Platform</th>
                <th>Price</th>
                <th>Rating</th>
                <th>Availability</th>
              </tr>
            </thead>
            <tbody>
              {data.items.flatMap((product) =>
                product.platforms.map((platform) => (
                  <tr key={`${product.product_id}-${platform.name}`}>
                    <td>{product.title}</td>
                    <td>{platform.name}</td>
                    <td className={platform.price.current === bestPrice ? "best" : ""}>INR {platform.price.current.toLocaleString("en-IN")}</td>
                    <td>{platform.rating.score}</td>
                    <td>{platform.availability}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
