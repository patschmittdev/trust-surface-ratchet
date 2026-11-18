# Adopter fixture

This imaginary session-authority list demonstrates a pinned test and coverage gate.
From the repository root:

```sh
npm run test:fixture
npm run check:fixture
npm run check:fixture:strict
```

Strict mode checks symbol imports and deep-equality assertion shape. It is a
heuristic; run the tests for execution evidence. Neither mode proves runtime
enforcement, security, or complete boundary coverage.
