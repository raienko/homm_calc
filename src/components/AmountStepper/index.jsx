export default function AmountStepper({ iconUrl, label, value, min = 0, onChange }) {
  function updateValue(delta) {
    onChange(Math.max(min, value + delta));
  }

  return (
    <div className="amount-stepper" aria-label={label}>
      <button type="button" onClick={() => updateValue(-10)}>
        -10
      </button>
      <button type="button" onClick={() => updateValue(-1)}>
        -1
      </button>
      <output>
        {iconUrl && <img src={iconUrl} alt="" />}
        <span>x{value}</span>
      </output>
      <button type="button" onClick={() => updateValue(1)}>
        +1
      </button>
      <button type="button" onClick={() => updateValue(10)}>
        +10
      </button>
    </div>
  );
}
