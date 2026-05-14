-- Add feasibility assessment field to promises
-- Allows editors to tag whether a promise is realistically deliverable

alter table public.promises
  add column feasibility text
    check (feasibility in (
      'fulfillable',    -- can be fully delivered
      'partial',        -- partially achievable; full delivery has barriers
      'blocked',        -- blocked by external factors (central govt, funding, law)
      'unfulfillable'   -- cannot be delivered given structural constraints
    ));
