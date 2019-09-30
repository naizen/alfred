import React, { Fragment } from 'react';
import { ChatkitProvider, TokenProvider } from '@pusher/chatkit-client-react';
import { ChatManager } from '@pusher/chatkit-client';
import { default as Chatkit } from '@pusher/chatkit-server';
import Login from './Login';
import Chat from './Chat';

const instanceLocator = process.env.REACT_APP_PUSHER_INSTANCE_LOCATOR;
const tokenProviderUrl = process.env.REACT_APP_PUSHER_TOKEN_PROVIDER_URL;
const tokenProvider = new TokenProvider({
  url: tokenProviderUrl,
});

const chatkit = new Chatkit({
  instanceLocator,
  key: process.env.REACT_APP_PUSHER_SECRET_KEY,
});

function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId');
  const otherUserId = 'alfred';
  let botChatManager = null;

  if (userId) {
    botChatManager = new ChatManager({
      instanceLocator,
      userId: otherUserId,
      tokenProvider: new TokenProvider({ url: tokenProviderUrl }),
    });
  }

  return (
    <div className="App font-sans text-primary">
      {userId ? (
        <Fragment>
          <div className="chat-window">
            <ChatkitProvider
              instanceLocator={instanceLocator}
              tokenProvider={tokenProvider}
              userId={userId}
            >
              <Chat otherUserId={otherUserId} botChatManager={botChatManager} />
            </ChatkitProvider>
          </div>
        </Fragment>
      ) : (
        <div className="login-window">
          <Login chatkit={chatkit} />
        </div>
      )}
    </div>
  );
}

export default App;
