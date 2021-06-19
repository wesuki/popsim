import "./styles.css";

import App from "/src/app";

const application = new App({ app: document.getElementById("app") });
application.draw();
application.run();
