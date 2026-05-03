import figma from "@figma/code-connect";
import { codeConnectDocumentUrl } from "./code-connect-urls";
import { DobeuInput } from "../src/Input";

figma.connect(DobeuInput, codeConnectDocumentUrl("input"), {
  props: {
    placeholder: figma.string("Placeholder")
  },
  example: ({ placeholder }) => <DobeuInput placeholder={placeholder} />
});
