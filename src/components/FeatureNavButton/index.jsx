import { Link } from "../../router.jsx";
import { resolveAssetUrl } from "../../lib/assetUrl.js";

export default function FeatureNavButton({ className = "", label, leftIconUrl, rightIconUrl, to }) {
  const classes = ["nav-link", "nav-link-feature", className].filter(Boolean).join(" ");

  return (
    <Link className={classes} to={to}>
      {leftIconUrl && <img src={resolveAssetUrl(leftIconUrl)} alt="" />}
      <span>{label}</span>
      {rightIconUrl && <img src={resolveAssetUrl(rightIconUrl)} alt="" />}
    </Link>
  );
}
