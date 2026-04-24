export function Ball({
  question,
  answer,
}: {
  question?: string;
  answer?: string;
}) {
  return (
    <div className="container">
      <div className="ball">
        {answer ? (
          <>
            <div className="question">{question}</div>
            <div className="answer">{answer}</div>
          </>
        ) : (
          <div className="question">Shaking...</div>
        )}
      </div>
    </div>
  );
}
