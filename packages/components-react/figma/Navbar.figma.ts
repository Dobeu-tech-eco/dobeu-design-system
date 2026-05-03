import figma from "@figma/code-connect";
import { codeConnectDocumentUrl } from "./code-connect-urls";
import { DobeuNavbar } from "../src/Navbar";

figma.connect(DobeuNavbar, codeConnectDocumentUrl("navbar"), {
  props: {
    brand: figma.string("Brand")
  },
  example: ({ brand }) => <DobeuNavbar brand={brand} />
});
