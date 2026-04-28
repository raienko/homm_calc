import { Link } from "../../router.jsx";

export default function FeatureNavButton({ className = "", label, leftIconUrl, rightIconUrl, to }) {
  const classes = ["nav-link", "nav-link-feature", className].filter(Boolean).join(" ");

  return (
    <Link className={classes} to={to}>
      {leftIconUrl && <img src={leftIconUrl} alt="" />}
      <span>{label}</span>
      {rightIconUrl && <img src={rightIconUrl} alt="" />}
    </Link>
  );
}
