import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api";
import { ErrorState, Loading } from "../components/State";

export function ProductDetail() {
  const { id = "" } = useParams();
  const product = useQuery({ queryKey: ["product", id], queryFn: () => api.product(id), enabled: Boolean(id) });
  const history = useQuery({ queryKey: ["price-history", id], queryFn: () => api.priceHistory(id), enabled: Boolean(id) });

  if (product.isLoading) return <Loading />;
  if (product.error) return <ErrorState error={product.error} />;
  if (!product.data) return null;

  const chartData = (history.data?.points ?? []).map((point) => ({
    ...point,
    date: new Date(point.recorded_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
  }));

  return (
    <section>
      <div className="pageHeader">
        <div>
          <h1>{product.data.title}</h1>
          <p>{product.data.brand} / {product.data.category.l1} / {product.data.category.l2}</p>
        </div>
      </div>
      <div className="metrics">
        {product.data.platforms.map((platform) => (
          <div className="metric" key={platform.name}>
            <span>{platform.name}</span>
            <strong>INR {platform.price.current.toLocaleString("en-IN")}</strong>
            <small>{platform.availability} / {platform.rating.score} rating</small>
          </div>
        ))}
      </div>
      <div className="panel">
        <h2>Price History</h2>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="split">
        <div className="panel">
          <h2>Attributes</h2>
          {Object.entries(product.data.attributes).map(([key, value]) => (
            <p key={key}><strong>{key}</strong>: {String(value)}</p>
          ))}
        </div>
        <div className="panel">
          <h2>Variants</h2>
          {product.data.variants.map((variant, index) => (
            <p key={index}>{Object.entries(variant).map(([key, value]) => `${key}: ${value}`).join(" / ")}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
