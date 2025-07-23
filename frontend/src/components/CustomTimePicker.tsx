const CustomTimePicker = () => {
  return (
    <div>
      <ul>
        {[...new Array(12)].map((_, i) => {
          return <li key={i}>{i + 1}</li>;
        })}
      </ul>
    </div>
  );
};
