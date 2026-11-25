/* ===================================
   LISTING.JS — PG Listings Logic
   =================================== */

// ================= ELEMENTS =================
const searchInput     = document.getElementById("searchInput");
const searchBtn       = document.getElementById("searchBtn");
const cityButtons     = document.querySelectorAll(".city-btn");

const filterBtn       = document.querySelector(".filter-btn");
const filterPanel     = document.getElementById("filterPanel");
const overlay         = document.getElementById("filterOverlay");
const closeFilterBtn  = document.getElementById("closeFilter");

const applyBtn        = document.getElementById("applyFilter");
const clearBtn        = document.getElementById("clearFilter");
const resultCount     = document.getElementById("resultCount");

const listingsGrid    = document.getElementById("listingsGrid");
const emptyState      = document.getElementById("emptyState");
const resetAllBtn     = document.getElementById("resetAll");

const activeFiltersBar = document.getElementById("activeFiltersBar");
const activeChips      = document.getElementById("activeChips");

// ================= STATE =================
let activeCity = "all";

// ================= HELPERS =================

/** Always fetch live card NodeList */
function getCards() {
  return document.querySelectorAll(".listing-card");
}

/** Parse a price range string "min-max" → { min, max } */
function parsePriceRange(val) {
  const [min, max] = val.split("-").map(Number);
  return { min, max };
}

/** Collect all currently checked values for a given input name */
function getChecked(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);
}

/** Get single selected radio value */
function getRadio(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || null;
}

// ================= MAIN FILTER FUNCTION =================
function filterListings() {
  const searchText = searchInput.value.toLowerCase().trim();

  const sort       = getRadio("sort");
  const price      = getRadio("price");
  const ratingMin  = getRadio("rating");
  const distance   = getRadio("distance");

  const roomTypes  = getChecked("room");
  const genders    = getChecked("gender");
  const foodTypes  = getChecked("food");
  const amenities  = getChecked("amenity");

  let visibleCards = [];

  getCards().forEach(card => {
    let show = true;

    const name       = card.querySelector("h3").innerText.toLowerCase();
    const location   = card.querySelector(".location").innerText.toLowerCase();
    const cardPrice  = parseInt(card.dataset.price);
    const cardRating = parseFloat(card.dataset.rating);
    const cardRoom   = card.dataset.room;
    const cardFood   = card.dataset.food;
    const cardFoodType = card.dataset.foodtype || "";
    const cardGender = card.dataset.gender;
    const cardDist   = parseFloat(card.dataset.distance);
    const cardAmenities = (card.dataset.amenities || "").split(",").map(a => a.trim());

    // --- SEARCH ---
    if (searchText && !(name.includes(searchText) || location.includes(searchText))) {
      show = false;
    }

    // --- CITY ---
    if (activeCity !== "all" && !location.includes(activeCity.toLowerCase())) {
      show = false;
    }

    // --- PRICE ---
    if (price) {
      const { min, max } = parsePriceRange(price);
      if (cardPrice < min || (max && cardPrice > max)) show = false;
    }

    // --- ROOM TYPE ---
    if (roomTypes.length && !roomTypes.includes(cardRoom)) {
      show = false;
    }

    // --- FOOD ---
    // Food checkboxes: "food", "nofood", "vegonly", "vegnonveg"
    if (foodTypes.length) {
      const foodMatch = foodTypes.some(f => {
        if (f === "food")       return cardFood === "food";
        if (f === "nofood")     return cardFood === "nofood";
        if (f === "vegonly")    return cardFoodType === "vegonly";
        if (f === "vegnonveg")  return cardFoodType === "vegnonveg";
        return false;
      });
      if (!foodMatch) show = false;
    }

    // --- GENDER ---
    if (genders.length && !genders.includes(cardGender)) {
      show = false;
    }

    // --- AMENITIES (AND logic: all selected amenities must be present) ---
    if (amenities.length) {
      const allPresent = amenities.every(a => cardAmenities.includes(a));
      if (!allPresent) show = false;
    }

    // --- DISTANCE ---
    if (distance && cardDist > parseFloat(distance)) {
      show = false;
    }

    // --- MINIMUM RATING ---
    if (ratingMin && cardRating < parseFloat(ratingMin)) {
      show = false;
    }

    // --- APPLY VISIBILITY ---
    card.style.display = show ? "block" : "none";
    if (show) visibleCards.push(card);
  });

  // ================= SORT =================
  if (sort && visibleCards.length > 1) {
    visibleCards.sort((a, b) => {
      const pa = parseInt(a.dataset.price);
      const pb = parseInt(b.dataset.price);
      const ra = parseFloat(a.dataset.rating);
      const rb = parseFloat(b.dataset.rating);
      if (sort === "low")    return pa - pb;
      if (sort === "high")   return pb - pa;
      if (sort === "rating") return rb - ra;
      return 0;
    });
    visibleCards.forEach(card => listingsGrid.appendChild(card));
  }

  // ================= RESULT COUNT =================
  const count = visibleCards.length;
  if (resultCount) {
    resultCount.innerText = count === 1 ? "1 property found" : `${count} properties found`;
  }

  // ================= EMPTY STATE =================
  if (count === 0) {
    emptyState.style.display = "block";
    listingsGrid.style.display = "none";
  } else {
    emptyState.style.display = "none";
    listingsGrid.style.display = "grid";
  }

  // ================= ACTIVE FILTER CHIPS =================
  updateActiveChips({ searchText, price, sort, ratingMin, distance, roomTypes, genders, foodTypes, amenities });
}

// ================= ACTIVE FILTER CHIPS =================
function updateActiveChips({ searchText, price, sort, ratingMin, distance, roomTypes, genders, foodTypes, amenities }) {
  const chips = [];

  const labels = {
    sort:     { low: "Price: Low→High", high: "Price: High→Low", rating: "Highest Rated" },
    price:    { "0-5000": "Under ₹5K", "5000-8000": "₹5K–₹8K", "8000-99999": "₹8K+" },
    rating:   { "4.5": "4.5+ Stars", "4": "4+ Stars", "3": "3+ Stars" },
    distance: { "0.5": "Within 500m", "1": "Within 1km", "3": "Within 3km" },
    room:     { single: "Single", double: "Double", triple: "Triple", private: "Private" },
    gender:   { boys: "Boys", girls: "Girls", unisex: "Co-living/Unisex" },
    food:     { food: "With Food", nofood: "Without Food", vegonly: "Veg Only", vegnonveg: "Veg+Non-Veg" },
    amenity:  { wifi: "WiFi", ac: "AC", parking: "Parking", gym: "Gym", laundry: "Laundry",
                housekeeping: "Housekeeping", "attached-bathroom": "Attached Bath",
                cctv: "CCTV", geyser: "Geyser" }
  };

  if (searchText)   chips.push({ label: `"${searchText}"`, key: "search" });
  if (activeCity !== "all") chips.push({ label: activeCity, key: "city" });
  if (sort)         chips.push({ label: labels.sort[sort], key: "sort" });
  if (price)        chips.push({ label: labels.price[price], key: "price" });
  if (ratingMin)    chips.push({ label: labels.rating[ratingMin], key: "rating" });
  if (distance)     chips.push({ label: labels.distance[distance], key: "distance" });

  roomTypes.forEach(v => chips.push({ label: labels.room[v], key: `room-${v}` }));
  genders.forEach(v => chips.push({ label: labels.gender[v], key: `gender-${v}` }));
  foodTypes.forEach(v => chips.push({ label: labels.food[v], key: `food-${v}` }));
  amenities.forEach(v => chips.push({ label: labels.amenity[v], key: `amenity-${v}` }));

  if (chips.length > 0) {
    activeFiltersBar.style.display = "flex";
    activeChips.innerHTML = chips.map(c =>
      `<span class="filter-chip" data-key="${c.key}">${c.label} <span class="chip-remove">✕</span></span>`
    ).join("");

    // Chip remove handlers
    activeChips.querySelectorAll(".filter-chip").forEach(chip => {
      chip.addEventListener("click", () => removeChip(chip.dataset.key));
    });
  } else {
    activeFiltersBar.style.display = "none";
    activeChips.innerHTML = "";
  }
}

function removeChip(key) {
  if (key === "search") { searchInput.value = ""; }
  else if (key === "city") {
    activeCity = "all";
    cityButtons.forEach(b => b.classList.remove("active"));
    cityButtons[0]?.classList.add("active");
  }
  else if (key === "sort")   { document.querySelector('input[name="sort"]:checked').checked = false; }
  else if (key === "price")  { document.querySelector('input[name="price"]:checked').checked = false; }
  else if (key === "rating") { document.querySelector('input[name="rating"]:checked').checked = false; }
  else if (key === "distance") { document.querySelector('input[name="distance"]:checked').checked = false; }
  else if (key.startsWith("room-"))    { uncheckValue("room", key.replace("room-", "")); }
  else if (key.startsWith("gender-"))  { uncheckValue("gender", key.replace("gender-", "")); }
  else if (key.startsWith("food-"))    { uncheckValue("food", key.replace("food-", "")); }
  else if (key.startsWith("amenity-")) { uncheckValue("amenity", key.replace("amenity-", "")); }
  filterListings();
}

function uncheckValue(name, value) {
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el) el.checked = false;
}

// ================= SEARCH EVENTS =================
searchBtn.addEventListener("click", filterListings);
searchInput.addEventListener("keyup", filterListings);

// ================= CITY FILTER =================
cityButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    cityButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeCity = btn.dataset.city;
    filterListings();
  });
});

// ================= FILTER PANEL OPEN / CLOSE =================
filterBtn.addEventListener("click", openPanel);

function openPanel() {
  filterPanel.classList.add("active");
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closePanel() {
  filterPanel.classList.remove("active");
  overlay.classList.remove("active");
  document.body.style.overflow = "";
}

closeFilterBtn.addEventListener("click", closePanel);
overlay.addEventListener("click", closePanel);

// Close on Escape key
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closePanel();
});

// ================= APPLY FILTER =================
applyBtn.addEventListener("click", () => {
  filterListings();
  closePanel();
});

// ================= CLEAR FILTER =================
function resetAllFilters() {
  document.querySelectorAll("input[type='radio'], input[type='checkbox']").forEach(i => i.checked = false);

  activeCity = "all";
  cityButtons.forEach(b => b.classList.remove("active"));
  cityButtons[0]?.classList.add("active");

  searchInput.value = "";
  filterListings();
}

clearBtn.addEventListener("click", resetAllFilters);
if (resetAllBtn) resetAllBtn.addEventListener("click", () => { resetAllFilters(); closePanel(); });

// ================= VIEW DETAILS (delegated) =================
listingsGrid.addEventListener("click", e => {
  if (e.target.classList.contains("view-btn")) {
    // The redirect is handled seamlessly by the inline onclick attribute on the .listing-card element.
    // Removed the alert placeholder so it navigates immediately.
  }
});

// ================= INITIAL RENDER =================
window.addEventListener("DOMContentLoaded", () => {
  filterListings();
  
  // Make all non-Sunrise PGs visually disabled across the listing app
  const cards = document.querySelectorAll(".listing-card");
  cards.forEach(card => {
    const title = card.querySelector("h3")?.innerText || "";
    if (title.trim() !== "Sunrise PG Residency") {
      card.style.opacity = "0.6";
      card.style.pointerEvents = "none"; // Hard-locks the entire card and buttons
      const btn = card.querySelector(".view-btn");
      if (btn) {
        btn.innerText = "Currently Unavailable";
        btn.style.background = "#e2e8f0";
        btn.style.color = "#64748b";
        btn.style.boxShadow = "none";
      }
    }
  });
});
