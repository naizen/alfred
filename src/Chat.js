import Moment from 'react-moment';
import React, { useState, useEffect } from 'react';
import { withChatkitOneToOne } from '@pusher/chatkit-client-react';
import alfredAvatar from './assets/alfred-avatar.jpg';
import { ReactComponent as LoaderMessage } from './assets/loader-message.svg';

const firstEntityValue = (entities, entity) => {
  const val =
    entities &&
    entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value;

  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};

const botResponses = {
  greetings: ['Hello, how may I help you?'],
};

function Chat(props) {
  const [pendingMessage, setPendingMessage] = useState('');
  const [bot, setBot] = useState(null);
  const [currentRoomId, setCurrentRoomId] = useState('');
  const [isChatLoaded, setIsChatLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [botMessageLoading, setBotMessageLoading] = useState(false);

  const messageList = React.createRef();

  const handleMessageKeyDown = event => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleMessageChange = event => {
    setPendingMessage(event.target.value);
  };

  const handleSendMessage = () => {
    if (pendingMessage === '') {
      return;
    }
    props.chatkit.sendSimpleMessage({ text: pendingMessage }).then(() => {
      getBotResponse(pendingMessage);
    });

    setPendingMessage('');
  };

  const handlePrewrittenMessage = message => {
    if (message === '') {
      return;
    }
    props.chatkit.sendSimpleMessage({ text: message }).then(() => {
      getBotResponse(message);
    });
  };

  const getBotResponse = message => {
    const witAiUrl = 'https://api.wit.ai/message?q=' + message;
    const auth = 'Bearer ' + process.env.REACT_APP_WIT_TOKEN;
    setBotMessageLoading(true);
    fetch(witAiUrl, { headers: { Authorization: auth } })
      .then(res => res.json())
      .then(data => {
        //console.log('wit data: ', data);
        handleBotMessage(data);
        setBotMessageLoading(false);
      });
  };

  const handleBotMessage = ({ entities }) => {
    const intent = firstEntityValue(entities, 'intent');
    const greetings = firstEntityValue(entities, 'greetings');
    const location = firstEntityValue(entities, 'location');
    const joke = firstEntityValue(entities, 'getJoke');

    if (intent === 'weather') {
      if (location) {
        getWeather(location).then(msg => {
          bot.sendSimpleMessage({ roomId: currentRoomId, text: msg });
        });
      } else if (!location && currentLocation) {
        getWeather(null, currentLocation).then(msg => {
          bot.sendSimpleMessage({ roomId: currentRoomId, text: msg });
        });
      } else if (!currentLocation && !location) {
        const msg = "I'd love to give you the weather but for where?";
        bot.sendSimpleMessage({ roomId: currentRoomId, text: msg });
      }
    } else if (joke) {
      getJoke().then(joke => {
        bot.sendSimpleMessage({ roomId: currentRoomId, text: joke });
      });
    } else if (greetings) {
      const msg = getGreeting();
      bot.sendSimpleMessage({ roomId: currentRoomId, text: msg });
    }
  };

  const getGreeting = index => {
    let greeting =
      botResponses.greetings[
        index || Math.floor(Math.random() * botResponses.greetings.length)
      ];
    let greetingArr = greeting.split(',');
    greetingArr[0] = greetingArr[0] + ' ' + props.chatkit.currentUser.name;
    greeting = greetingArr.join(',');
    return greeting;
  };

  const getJoke = () => {
    return fetch('https://official-joke-api.appspot.com/random_joke')
      .then(res => res.json())
      .then(data => {
        return `${data.setup} ${data.punchline}`;
      })
      .catch(console.error);
  };

  const getWeather = (location, currentLocation) => {
    const apiKey = process.env.REACT_APP_OPENWEATHER_API_KEY;
    const baseApiUrl = 'https://api.openweathermap.org/data/2.5/weather';
    let apiUrl = `${baseApiUrl}?q=${location}&appid=${apiKey}&units=imperial`;

    if (currentLocation) {
      apiUrl = `${baseApiUrl}?lat=${currentLocation.lat}&lon=${currentLocation.long}&appid=${apiKey}&units=imperial`;
    }

    return fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        if (data.cod !== 200 && data.message) {
          return data.message;
        }
        const conditions = data.weather[0].description;
        const temperature = data.main.temp + '°F';
        const msg = `The weather in ${data.name} is ${temperature} and ${conditions}.`;
        return msg;
      })
      .catch(() => console.error);
  };

  useEffect(() => {
    messageList.current.scrollTop = messageList.current.scrollHeight;
    const { chatkit, botChatManager } = props;
    if (chatkit.currentUser) {
      const roomSubscriptions = chatkit.currentUser.roomSubscriptions;
      const roomId = Object.keys(roomSubscriptions)[0];
      setCurrentRoomId(roomId);

      if (!bot) {
        navigator.geolocation.getCurrentPosition(position => {
          const lat = position.coords.latitude;
          const long = position.coords.longitude;
          setCurrentLocation({ lat, long });
        });
        botChatManager.connect().then(bot => {
          setBot(bot);
        });
      } else {
        if (!chatkit.isLoading && !isChatLoaded) {
          if (chatkit.messages.length === 0) {
            let greeting = botResponses.greetings[0];
            let greetingArr = greeting.split(',');
            greetingArr[0] = greetingArr[0] + ' ' + chatkit.currentUser.name;
            greeting = greetingArr.join(',');
            bot.sendSimpleMessage({ roomId, text: greeting });
          }
          setIsChatLoaded(true);
        }
      }
    }
  }, [messageList, props, bot, isChatLoaded]);

  // Show messages from Chatkit
  const messages = props.chatkit.messages.map(m => ({
    id: m.id,
    isOwnMessage: m.sender.id === props.chatkit.currentUser.id,
    createdAt: m.createdAt,
    textContent: m.parts[0].payload.content,
  }));

  return (
    <div className="Chat">
      <div className="Chat__titlebar shadow">
        <img
          src={alfredAvatar}
          className="Chat__titlebar__avatar"
          alt="avatar"
        />
        <div className="Chat__titlebar__details">
          <span>
            {props.chatkit.isLoading
              ? 'Loading...'
              : props.chatkit.otherUser.name}
          </span>
        </div>
      </div>
      <div className="Chat__messages" ref={messageList}>
        {messages.map(m => (
          <Message key={m.id} {...m} />
        ))}
        {botMessageLoading && (
          <div className="Chat__messages__message__wrapper Chat__messages__message__wrapper--other">
            <div className="Chat__messages__message__wrapper__inner">
              <div className="Chat__messages__message Chat__messages__message--other Chat__messages__message--loading">
                <div className="Chat__messages__message__content loader-message">
                  <LoaderMessage />
                </div>
                <div className="Chat__messages__message__arrow" />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="prewritten py-3 px-4">
        <button
          class="btn-primary-outline bg-transparent py-2 px-4 border rounded-full"
          onClick={() => handlePrewrittenMessage('Tell me a joke')}
        >
          Tell me a joke
        </button>
        <button
          class="btn-primary-outline bg-transparent py-2 px-4 border rounded-full"
          onClick={() => handlePrewrittenMessage("What's the weather?")}
        >
          What's the weather?
        </button>
      </div>
      <div className="Chat__compose">
        <input
          className="Chat__compose__input appearance-none border focus:outline-none focus:shadow-outline"
          type="text"
          placeholder="Type a message..."
          value={pendingMessage}
          onChange={handleMessageChange}
          onKeyDown={handleMessageKeyDown}
        />
        <button
          className="Chat__compose__button bg-primary text-white"
          onClick={handleSendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function Message({ isOwnMessage, isLatestMessage, createdAt, textContent }) {
  return (
    <div
      className={
        isOwnMessage
          ? 'Chat__messages__message__wrapper Chat__messages__message__wrapper--self'
          : 'Chat__messages__message__wrapper Chat__messages__message__wrapper--other'
      }
    >
      <div className="Chat__messages__message__wrapper__inner">
        <div
          className={
            isOwnMessage
              ? 'Chat__messages__message Chat__messages__message--self'
              : 'Chat__messages__message Chat__messages__message--other'
          }
        >
          <div className="Chat__messages__message__content">{textContent}</div>
          <div className="Chat__messages__message__time">
            <Moment
              calendar={{
                sameDay: 'LT',
                lastDay: '[Yesterday at] LT',
                lastWeek: '[last] dddd [at] LT',
              }}
            >
              {createdAt}
            </Moment>
          </div>
          <div
            className={
              isOwnMessage
                ? 'Chat__messages__message__arrow alt'
                : 'Chat__messages__message__arrow'
            }
          />
        </div>
      </div>
    </div>
  );
}

export default withChatkitOneToOne(Chat);
