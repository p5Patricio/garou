# Spec: Mixed-Unit Progress Tracking

## Purpose
Normalize mixed weight units (`kg`, `lb`, `placas`, `bw`) for chart scaling while displaying original values and units.

## Requirements
1. All weight inputs MUST be normalized to `kg` for progress chart scaling.
2. Conversion rates MUST be:
   - `1 lb` = `0.453592 kg`
   - `1 placa` = `5 kg`
   - `bw` (bodyweight) = `0 kg` (or local profile weight)
3. Chart labels MUST show white (`#ffffff`) text.
4. Dates on the chart axis MUST be formatted as `DD/MM/YYYY`.
5. Data points on the chart MUST display their original values and units via `displayVal` and `displayUnit`.

## Scenarios
Given a progress chart with points in "kg", "lb", and "placas"
When the chart scales and renders
Then all points MUST be normalized to "kg" for positions
And data points MUST show original value and unit
And chart labels MUST be white (#ffffff)
And dates MUST format as DD/MM/YYYY
