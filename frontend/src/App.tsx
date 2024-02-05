import { Amplify, Auth } from "aws-amplify";
import { withAuthenticator } from "@aws-amplify/ui-react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useState, useEffect } from "react";
import "./index.css";
import Layout from "./routes/layout";
import Documents from "./routes/documents";
import Chat from "./routes/chat";
import Layout2 from "./components/Layout2";
import mondaySdk from "monday-sdk-js";
import "./App.css";
import Loading from '../public/loading-dots.svg';
const monday = mondaySdk();

Amplify.configure({
  Auth: {
    userPoolId: import.meta.env.VITE_USER_POOL_ID,
    userPoolWebClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
    region: import.meta.env.VITE_API_REGION,
  },
  API: {
    endpoints: [
      {
        name: "serverless-pdf-chat",
        endpoint: import.meta.env.VITE_API_ENDPOINT,
        region: import.meta.env.VITE_API_REGION,
        custom_header: async () => {
          return {
            Authorization: `Bearer ${(await Auth.currentSession())
              .getIdToken()
              .getJwtToken()}`,
          };
        },
      },
    ],
  },
});

let router;

function App(): JSX.Element {
  const [context, setContext] = useState<any | null>(null);

  useEffect(() => {
    monday.execute("valueCreatedForUser");
    monday.listen("context", (res) => {
      setContext(res.data);
    });
  }, []);

  if (context) {
    sessionStorage.setItem("boardId", context.boardId);
    const storedBoardId = sessionStorage.getItem("boardId");
    // console.log("s boardid", storedBoardId);

    return <Layout2 />;
  } else {
    router = createBrowserRouter([
      {
        path: "/",
        element: <Layout />,
        children: [
          {
            index: true,
            Component: Documents,
          },
          {
            path: "/doc/:documentid/:conversationid",
            Component: Chat,
          },
        ],
      },
    ]);
  }

  return <RouterProvider router={router!} />;
}

export default withAuthenticator(App, { hideSignUp: true });
