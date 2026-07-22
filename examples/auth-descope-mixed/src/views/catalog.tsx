import { useToolInfo } from "../helpers.js";

function Catalog() {
  const { output, isPending, isSuccess } = useToolInfo<"browse-catalog">();

  if (isPending) {
    return <p>Loading catalog…</p>;
  }

  if (!isSuccess || !output) {
    return <p>No catalog available.</p>;
  }

  return (
    <div>
      <h2>Coffee catalog</h2>
      <p>Viewing as {output.user}</p>
      <ul>
        {output.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default Catalog;
