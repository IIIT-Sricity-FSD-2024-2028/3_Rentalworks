# RentBro Owner Portal — React Application

This is the converted **Owner Dashboard** React application for the RentBro PG Rental & Property Management System. It replaces the legacy static HTML/CSS/JavaScript pages with a modern, component-driven, beginner-friendly React application.

---

## 🚀 Getting Started

Follow these steps to run the application locally:

```bash
# 1. Navigate to the owner-react directory
cd front-end-react/owner-react

# 2. Install dependencies
npm install

# 3. Start the Vite development server
npm run dev
```

The application will be running at `http://localhost:5174/` (or the port specified by Vite).

---

## 📁 Project Structure

```text
front-end-react/
└── owner-react/
    ├── public/
    │   └── data.json              # Initial default data for properties, issues, notifications, policy, and profile
    ├── src/
    │   ├── components/
    │   │   ├── Sidebar.jsx        # Navigation sidebar with dynamic badge counts & mobile drawer
    │   │   ├── Header.jsx         # Topbar with page titles, search bar, and logout
    │   │   ├── Layout.jsx         # Master layout wrapping Sidebar, Header, and <Outlet />
    │   │   └── Toast.jsx          # Reusable toast feedback notification popup
    │   ├── pages/
    │   │   ├── Dashboard.jsx      # Overview metrics, recent issues, and occupancy rates
    │   │   ├── Properties.jsx     # Property cards, live search, filtering, view modal, and edit modal
    │   │   ├── AddProperty.jsx    # Multi-section property submission form with validation
    │   │   ├── Issues.jsx         # Issue tracking, status updates (Resolved/In Progress), and report modal
    │   │   ├── Notifications.jsx  # Notification center, filter tabs, mark as read, and message compose
    │   │   ├── Policy.jsx         # PG house rules, financial policies, and toggle settings
    │   │   ├── Profile.jsx        # Owner profile, password change modal, 2FA modal, and JSON data export
    │   │   └── Subscription.jsx   # Standard and Premium plans pricing with simulated checkout modal
    │   ├── App.jsx                # Main application component, React Router routes, and central data state
    │   ├── main.jsx               # React entry point mounting to root DOM element
    │   └── style.css              # Unified design system stylesheet preserving existing styles & animations
    ├── index.html                 # HTML template with Google Fonts and Material Icons
    ├── vite.config.js             # Vite configuration
    ├── package.json               # Dependencies and build scripts
    └── README.md                  # Project documentation and Viva preparation guide
```

---

## 🌟 Key Features Converted

1. **Dashboard (`/`)**:
   - Total properties count with active status indicator.
   - Overall PG occupancy rate percentage and filled/total room statistics.
   - Estimated monthly revenue calculated dynamically.
   - Open issues count with status indicators.
   - Recent issues list and property breakdown bars.
   - Quick action shortcuts with live badges.

2. **Properties (`/properties`)**:
   - Real-time search by property name, city, or address using `.filter()`.
   - Filter by Property Type (Mixed, Male, Female) and Status (Active, Inactive).
   - Sort by Name, Rent (Low to High / High to Low), or Occupancy rate.
   - Detailed View Property modal.
   - Edit Property modal with amenity toggles, validation, and real-time state updates.
   - Delete Property confirmation dialog.

3. **Add Property (`/add-property`)**:
   - Step 1: Basic Information (Name, Address, City, State, 6-digit Pincode, Type).
   - Step 2: Property Details (Capacity, Total Rooms, Monthly Rent, Occupied Rooms, Status).
   - Step 3: Amenities toggles (WiFi, AC, Laundry, Parking, Gym, Mess, Power Backup, Security).
   - Step 4: Optional description notes.
   - Full form validation and persistence to `localStorage`.

4. **Issues Management (`/issues`)**:
   - Open, In Progress, and Resolved statistic cards.
   - Search by issue title, property name, or reporter.
   - Filter by Status, Priority (High, Medium, Low), and Category.
   - Resolve button (fires notification to Tenant and Warden).
   - "In Progress" button and Delete confirmation modal.
   - "Report Issue" modal to add new maintenance tickets.

5. **Notifications (`/notifications`)**:
   - Filter tabs: All, Unread, Alerts, Success, Reminders.
   - Unread notification badges and blue accent borders.
   - "Mark as Read", "Mark All Read", and "Clear All" actions.
   - Compose and send notifications to Warden or Admin.

6. **Policy (`/policy`)**:
   - Rent due date, late fee, security deposit months, annual rent increase, lease term, notice period.
   - Interactive toggle switches for Auto-Renew Lease, Smoking Allowed, and Pets Allowed.
   - Maintenance window and rent increase frequency dropdowns.
   - "Reset to Default" and "Save Policy" with persistent storage.

7. **Profile (`/profile`)**:
   - Profile hero with owner initials, email, total properties, and monthly revenue.
   - Personal information and location editing.
   - "Change Password" modal with matching validation.
   - "Two-Factor Authentication" modal with secret key.
   - "Download My Data" button triggering a clean `pg-manager-data.json` file download.

8. **Subscription (`/subscription`)**:
   - Standard Plan (₹5,000/yr) and Premium Plan (₹8,000/yr).
   - Simulated payment checkout modal with processing spinner and success screen.
   - Updates session and registered owner records upon completion.

---

## 💡 React Concepts Guide (Lab Exam & Viva Preparation)

### 1. Functional Components
Every page and UI piece is a JavaScript function that returns JSX:
```jsx
function Dashboard({ properties, issues }) {
  return <div>{properties.length} Properties</div>;
}
```

### 2. Props (Parent to Child Data Passing)
Props are inputs passed from parent components to child components:
- `App.jsx` holds the master data state and passes it down:
  `<Dashboard properties={data.properties} />`
- Children receive data as arguments: `function Dashboard({ properties }) { return <div>{properties.length}</div>; }`

### 3. `useState` (State Management)
`useState` allows components to remember values between renders:
```jsx
const [search, setSearch] = useState('');
```
When `setSearch(newValue)` is called, React re-renders the component with the new value.

### 4. `useEffect` (Side Effects & Data Loading)
`useEffect` runs code after rendering, such as fetching data or reading from `localStorage`:
```jsx
useEffect(() => {
  const stored = localStorage.getItem('pg_manager_data_storage');
  if (stored) setData(JSON.parse(stored));
}, []); // Empty dependency array means run once on mount
```

### 5. `.map()` (List Rendering)
Used to transform an array of data into JSX elements:
```jsx
{properties.map((p) => (
  <div key={p.id} className="property-card">
    <h3>{p.name}</h3>
  </div>
))}
```

### 6. `.filter()` (Search & Filter Logic)
Used to display items matching user input without modifying the original array:
```jsx
const filtered = properties.filter((p) =>
  p.name.toLowerCase().includes(search.toLowerCase())
);
```

### 7. Conditional Rendering
Rendering elements only when certain conditions are true:
- Ternary: `{isOpen ? <Modal /> : null}`
- Logical AND: `{unreadCount > 0 && <span className="badge">{unreadCount}</span>}`

---

## 🎓 Sample Viva Questions & Answers

**Q1: What is JSX?**
> **A:** JSX stands for JavaScript XML. It allows us to write HTML-like syntax directly inside JavaScript. Under the hood, JSX is compiled by Vite/Babel into `React.createElement()` calls.

**Q2: What is the difference between Props and State?**
> **A:** Props are read-only inputs passed from a parent component to a child component. State is mutable data managed locally within a component using `useState`.

**Q3: Why do we use the `key` prop when mapping through lists?**
> **A:** The `key` prop gives each element a unique identity so React's Virtual DOM algorithm can efficiently track which items were added, modified, or removed without re-rendering the entire list.

**Q4: How does data persistence work in this project?**
> **A:** Data is stored in the browser's `localStorage` under the key `'pg_manager_data_storage'`. When the app loads, `useEffect` in `App.jsx` reads from `localStorage` or falls back to `/data.json`. Whenever a user adds or edits a property, `persistData()` writes the updated state back to `localStorage`.
