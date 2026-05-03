import figma from "@figma/code-connect";
import { codeConnectDocumentUrl } from "./code-connect-urls";
import { DobeuCard } from "../src/Card";

figma.connect(DobeuCard, codeConnectDocumentUrl("card"), {
  props: {
    title: figma.string("Title"),
    subtitle: figma.string("Subtitle")
  },
  example: ({ title, subtitle }) => (
    <DobeuCard title={title} subtitle={subtitle}>
      <p>Card body content.</p>
    </DobeuCard>
  )
});
