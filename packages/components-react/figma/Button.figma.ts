import figma from "@figma/code-connect";
import { codeConnectDocumentUrl } from "./code-connect-urls";
import { DobeuButton } from "../src/Button";

figma.connect(DobeuButton, codeConnectDocumentUrl("button"), {
  props: {
    children: figma.string("Label"),
    variant: figma.enum("Variant", {
      Primary: "primary",
      Secondary: "secondary"
    })
  },
  example: ({ children, variant }) => <DobeuButton variant={variant}>{children}</DobeuButton>
});
