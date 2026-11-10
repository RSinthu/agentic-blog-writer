import { Desk } from "@/components/Desk";
import { Masthead } from "@/components/Masthead";
export default function Home() {
  return <><a className="skip-link" href="#main-content">Skip to workspace</a><Masthead /><Desk /><footer className="app-footer"><span>galley. <span>Your ideas, thoughtfully written.</span></span><span>Research. Write. Make it yours.</span></footer></>;
}
