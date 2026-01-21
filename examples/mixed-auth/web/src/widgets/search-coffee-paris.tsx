import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers.js";
import "@/index.css";

function SearchCoffeeParis() {
  const { output, isPending, isSuccess } = useToolInfo<"search-coffee-paris">();

  if (isPending) {
    return (
      <div className="container centered">
        <span className="icon-large animate-spin">&#9749;</span>
        <p>Searching coffee shops...</p>
      </div>
    );
  }

  if (!isSuccess || !output) {
    return (
      <div className="container centered">
        <p>No results found</p>
      </div>
    );
  }

  const { shops, isPersonalized, totalCount } = output;

  return (
    <div className="container">
      <div className="header">
        <span className="header-icon">&#9749;</span>
        <span className="header-title">Coffee Shops in Paris</span>
        <span
          className={`header-badge ${isPersonalized ? "personalized" : ""}`}
        >
          {isPersonalized ? "Personalized" : "Public Results"}
        </span>
      </div>

      {!isPersonalized && (
        <div className="auth-banner">
          Sign in to see personalized recommendations and your favorites
        </div>
      )}

      <div className="grid">
        {shops.map((shop) => (
          <div key={shop.id} className="card animate-fade-in">
            <div className="card-image-container">
              <img src={shop.imageUrl} alt={shop.name} className="card-image" />
              {shop.isFavorite && (
                <span className="card-favorite">&#10084;</span>
              )}
            </div>
            <div className="card-content">
              <div className="card-header">
                <span className="card-name">{shop.name}</span>
                <div className="card-rating">
                  <span className="card-rating-star">&#9733;</span>
                  <span className="card-rating-value">
                    {shop.rating.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="card-location">
                <span>&#128205;</span>
                <span>{shop.neighborhood}</span>
              </div>
              <p className="card-specialty">{shop.specialty}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="footer">
        Showing {shops.length} of {totalCount} coffee shops
      </div>
    </div>
  );
}

export default SearchCoffeeParis;
mountWidget(<SearchCoffeeParis />);
