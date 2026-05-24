export function MentorTipCard({ tip }: { tip: string }) {
  return (
    <section className="panel mentor-card">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Mentor Fortuna</span>
          <h2>Dica educativa</h2>
        </div>
      </div>
      <p>{tip}</p>
      <p className="educational-note">
        Esta e uma simulacao educacional. O objetivo e aprender sobre risco,
        liquidez, diversificacao e renda.
      </p>
    </section>
  );
}
