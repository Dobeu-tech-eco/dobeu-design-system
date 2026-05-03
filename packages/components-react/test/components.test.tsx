import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DobeuButton, DobeuCard, DobeuInput, DobeuNavbar } from "../src";

describe("components-react primitives", () => {
  it("renders a primary button", () => {
    const html = renderToStaticMarkup(<DobeuButton>Try now</DobeuButton>);
    expect(html).toContain("Try now");
    expect(html).toContain("button");
  });

  it("renders input with placeholder", () => {
    const html = renderToStaticMarkup(<DobeuInput placeholder="Search software" />);
    expect(html).toContain("Search software");
  });

  it("renders card title and subtitle", () => {
    const html = renderToStaticMarkup(
      <DobeuCard title="Dobeu Reviews" subtitle="Structured software reviews">
        Body
      </DobeuCard>
    );
    expect(html).toContain("Dobeu Reviews");
    expect(html).toContain("Structured software reviews");
  });

  it("renders navbar brand", () => {
    const html = renderToStaticMarkup(<DobeuNavbar brand="dobeu.dev" />);
    expect(html).toContain("dobeu.dev");
    expect(html).toContain("navigation");
  });
});
