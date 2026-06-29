import { useRef, useEffect, useState } from "react";
import { userChatStore } from "../store/userChatStore";

const TABS = [
  { id: "chats", label: "Chats" },
  { id: "contacts", label: "Contacts" },
  { id: "recents", label: "Recents" },
];

function ActiveTabSwitch() {
  const { activeTab, setActiveTab } = userChatStore();
  const containerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  // Calculate indicator position based on active tab button position
  useEffect(() => {
    if (!containerRef.current) return;
    const activeBtn = containerRef.current.querySelector(`[data-tab="${activeTab}"]`);
    if (!activeBtn) {
      setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
      return;
    }
    const containerLeft = containerRef.current.getBoundingClientRect().left;
    const btnRect = activeBtn.getBoundingClientRect();
    setIndicatorStyle({
      left: btnRect.left - containerLeft,
      width: btnRect.width,
      opacity: 1,
    });
  }, [activeTab]);

  return (
    <div className="tab-switcher" ref={containerRef}>
      {/* Sliding gradient background pill */}
      <div
        className="tab-indicator"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          opacity: indicatorStyle.opacity,
          transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {TABS.map((tab) => (
        <button
          key={tab.id}
          data-tab={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`pill-tab ${activeTab === tab.id ? "active" : ""}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default ActiveTabSwitch;