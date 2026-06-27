import * as React from "react";

export const SidebarSection = ({ title, children }) => {
    const visibleChildren = React.Children.toArray(children).filter(Boolean);

    if (visibleChildren.length === 0) {
        return null;
    }

    return (
        <div className="sidebar-section">
            <p className="sidebar-section-title">{title}</p>
            <div className="sidebar-section-content">{visibleChildren}</div>
        </div>
    );
};

export const renderSidebarAction = (action) => {
    if (!action) {
        return null;
    }

    return <div>{action}</div>;
};

export const SidebarActionButton = ({
    children,
    className = "",
    tooltip,
    ariaLabel,
    ...props
}) => {
    const title =
        tooltip ?? (typeof children === "string" ? children : undefined);

    const buttonClassName = ["button-toolbar-action", className]
        .filter(Boolean)
        .join(" ");

    return (
        <button
            type="button"
            {...props}
            className={buttonClassName}
            title={title}
            aria-label={ariaLabel}
        >
            {children}
        </button>
    );
};
