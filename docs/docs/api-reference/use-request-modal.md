---
sidebar_position: 10
---

# useRequestModal

The `useRequestModal` hook returns a function to trigger a modal that is portaled outside of the widget iframe. This ensures the modal is correctly displayed and not limited to the widget's area, allowing for a better user experience when displaying detailed content or forms.

## Basic usage

```tsx
import { useRequestModal } from "skybridge/web";

function ModalTrigger() {
  const requestModal = useRequestModal();

  return (
    <button onClick={() => requestModal({ title: "Details" })}>
      View Details
    </button>
  );
}
```

## Returns

```tsx
requestModal: (options: { title: string }) => void
```

A function that triggers a modal to be displayed.

### Parameters

- `options: { title: string }`
  - **Required**
  - `title: string` - The title to display in the modal header

:::info
When the modal is opened, your widget will be re-rendered with `displayMode` set to `"modal"`. You can use the `useDisplayMode` hook to detect this and render different content accordingly.
:::

## Examples

### Modal with Different Content

```tsx
import { useRequestModal, useDisplayMode } from "skybridge/web";

function ProductWidget() {
  const requestModal = useRequestModal();
  const [displayMode] = useDisplayMode();

  // When in modal mode, show detailed view
  if (displayMode === "modal") {
    return (
      <div className="product-details">
        <h2>Product Details</h2>
        <p>Full product description with all specifications...</p>
        <ul>
          <li>Feature 1</li>
          <li>Feature 2</li>
          <li>Feature 3</li>
        </ul>
        <button>Add to Cart</button>
      </div>
    );
  }

  // Inline view shows summary
  return (
    <div className="product-summary">
      <h3>Product Name</h3>
      <p>Brief description...</p>
      <button onClick={() => requestModal({ title: "Product Details" })}>
        View Details
      </button>
    </div>
  );
}
```

### Settings Modal

```tsx
import { useRequestModal, useDisplayMode } from "skybridge/web";
import { useState } from "react";

function SettingsWidget() {
  const requestModal = useRequestModal();
  const [displayMode] = useDisplayMode();
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    language: "en",
  });

  if (displayMode === "modal") {
    return (
      <form className="settings-form">
        <label>
          <input
            type="checkbox"
            checked={settings.notifications}
            onChange={(e) =>
              setSettings((s) => ({ ...s, notifications: e.target.checked }))
            }
          />
          Enable Notifications
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.darkMode}
            onChange={(e) =>
              setSettings((s) => ({ ...s, darkMode: e.target.checked }))
            }
          />
          Dark Mode
        </label>
        <label>
          Language:
          <select
            value={settings.language}
            onChange={(e) =>
              setSettings((s) => ({ ...s, language: e.target.value }))
            }
          >
            <option value="en">English</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
          </select>
        </label>
      </form>
    );
  }

  return (
    <div className="settings-summary">
      <span>⚙️ Settings</span>
      <button onClick={() => requestModal({ title: "Settings" })}>
        Configure
      </button>
    </div>
  );
}
```

### Image Gallery Modal

```tsx
import { useRequestModal, useDisplayMode } from "skybridge/web";
import { useState } from "react";

type Image = {
  id: string;
  thumbnail: string;
  full: string;
  alt: string;
};

function ImageGallery({ images }: { images: Image[] }) {
  const requestModal = useRequestModal();
  const [displayMode] = useDisplayMode();
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (displayMode === "modal") {
    const current = images[selectedIndex];
    return (
      <div className="gallery-modal">
        <img src={current.full} alt={current.alt} />
        <div className="gallery-nav">
          <button
            onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
            disabled={selectedIndex === 0}
          >
            Previous
          </button>
          <span>
            {selectedIndex + 1} / {images.length}
          </span>
          <button
            onClick={() =>
              setSelectedIndex((i) => Math.min(images.length - 1, i + 1))
            }
            disabled={selectedIndex === images.length - 1}
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gallery-thumbnails">
      {images.slice(0, 4).map((image, index) => (
        <button
          key={image.id}
          onClick={() => {
            setSelectedIndex(index);
            requestModal({ title: "Gallery" });
          }}
        >
          <img src={image.thumbnail} alt={image.alt} />
        </button>
      ))}
      {images.length > 4 && <span>+{images.length - 4} more</span>}
    </div>
  );
}
```

### Form Modal

```tsx
import { useRequestModal, useDisplayMode, useWidgetState } from "skybridge/web";

type FormData = {
  name: string;
  email: string;
  submitted: boolean;
};

function ContactForm() {
  const requestModal = useRequestModal();
  const [displayMode] = useDisplayMode();
  const [formData, setFormData] = useWidgetState<FormData>({
    name: "",
    email: "",
    submitted: false,
  });

  if (displayMode === "modal") {
    if (formData.submitted) {
      return (
        <div className="form-success">
          <h2>Thank you, {formData.name}!</h2>
          <p>We'll be in touch at {formData.email}</p>
        </div>
      );
    }

    return (
      <form
        className="contact-form"
        onSubmit={(e) => {
          e.preventDefault();
          setFormData((prev) => ({ ...prev, submitted: true }));
        }}
      >
        <input
          type="text"
          placeholder="Your name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          required
        />
        <input
          type="email"
          placeholder="Your email"
          value={formData.email}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, email: e.target.value }))
          }
          required
        />
        <button type="submit">Submit</button>
      </form>
    );
  }

  return (
    <button onClick={() => requestModal({ title: "Contact Us" })}>
      Contact Us
    </button>
  );
}
```

