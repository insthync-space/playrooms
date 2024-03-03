'use client';
import { useSearchParams } from 'next/navigation';
import { gameSocket } from '@core/game-client';
import { Match } from '@heroiclabs/nakama-js';
import React, { useEffect, useState } from 'react';
import { MockedMCQQuestions } from '../../../mocks';
import { Question } from '../sections/mcq/questions/question';
import { uint8ArrayToNum } from '../../utils/convert';

enum MatchOpCodes {
  MATCH_STATE = 100,
  HOST_STATE = 101,
  PLAYER_SCORE = 102,
  QUESTION_INDEX = 103,
  TIME_LEFT = 104,
}

enum MatchState {
  LOADING = 'LOADING',
  READY = 'READY',
  STARTED = 'STARTED',
  ENDED = 'ENDED',
  NOT_FOUND = 'NOT_FOUND',
}

enum HostState {
  ELECTED = 'ELECTED',
  NOT_ELECTED = 'NOT_ELECTED',
}

enum PlayerState {
  READY = 'READY',
  NOT_READY = 'NOT_READY',
}

const STARTING_QUESTION_INDEX = 0;

export default function Match() {
  const searchParams = useSearchParams();
  const ticket = searchParams.get('ticket');
  const token = searchParams.get('token');

  const [currentPlayers, setCurrentPlayers] = useState([]);

  const [match, setMatch] = useState<null | Match>(null);
  const [amIHost, setAmIHost] = useState(false);
  const [questionRemainingTime, setQuestionRemainingTime] = useState(0);

  const [matchState, setMatchState] = useState(MatchState.READY);
  const [hostState, setHostState] = useState(HostState.NOT_ELECTED);
  const [playerState, setPlayerState] = useState(PlayerState.NOT_READY);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
    STARTING_QUESTION_INDEX
  );

  const questions = MockedMCQQuestions;

  useEffect(() => {
    switch (playerState) {
      case PlayerState.NOT_READY:
        gameSocket
          .joinMatch(ticket, token)
          .then((match) => {
            setMatch(match);
            const isFirstPlayer = !match.presences;
            if (isFirstPlayer) {
              setAmIHost(true);
              setHostState(HostState.ELECTED);
              gameSocket.sendMatchState(
                match.match_id,
                MatchOpCodes.HOST_STATE,
                HostState.ELECTED
              );
            }
          })
          .catch((error) => {
            console.error('Error joining match', error);
            setMatchState(MatchState.NOT_FOUND);
          });
        setPlayerState(PlayerState.READY);
        break;
    }
  }, [ticket, token, playerState]);

  gameSocket.onmatchdata = (matchData) => {
    const decodedData = new TextDecoder().decode(matchData.data);
    switch (matchData.op_code) {
      case MatchOpCodes.MATCH_STATE:
        switch (decodedData) {
          case MatchState.READY:
            setMatchState(MatchState.READY);
            break;
          // case MatchState.STARTED:
          //   setMatchState(MatchState.STARTED);
          //   break;
          // case MatchState.ENDED:
          //   setMatchState(MatchState.ENDED);
          //   break;
        }
        break;
      case MatchOpCodes.HOST_STATE:
        switch (decodedData) {
          case HostState.ELECTED:
            setHostState(HostState.ELECTED);
            break;
          case HostState.NOT_ELECTED:
            setHostState(HostState.NOT_ELECTED);
            break;
        }
        break;

      case MatchOpCodes.QUESTION_INDEX:
        setCurrentQuestionIndex(uint8ArrayToNum(matchData.data));
        break;

      case MatchOpCodes.TIME_LEFT:
        setQuestionRemainingTime(uint8ArrayToNum(matchData.data));
        break;

      case MatchOpCodes.PLAYER_SCORE:
        // const deservedPoints = uint8ArrayToNum(matchData.data);
        break;
    }
  };

  gameSocket.onmatchpresence = (matchPresence) => {
    matchPresence.joins &&
      setCurrentPlayers((prevPlayers) => [
        ...prevPlayers,
        ...matchPresence.joins,
      ]);
    matchPresence.leaves &&
      setCurrentPlayers((prevPlayers) =>
        prevPlayers.filter((player) => !matchPresence.leaves.includes(player))
      );
  };

  // const handleAnswer = (isCorrect: boolean) => {
  //   if (isCorrect) {
  //     // const deservedPoints = QUESTIONS_ALLOWED_TIME_IN_MS - timeLeft;
  //     const deservedPoints = 100;
  //     gameSocket.sendMatchState(
  //       match.match_id,
  //       MatchOpCodes.PLAYER_SCORE,
  //       numToUint8Array(deservedPoints)
  //     );
  //   }
  // };
  useEffect(() => {
    if (currentQuestionIndex === questions.length - 1) {
      setMatchState(MatchState.ENDED);
    }
  }, [currentQuestionIndex, questions.length]);

  useEffect(() => {
    if (matchState === MatchState.STARTED)
      if (questionRemainingTime === 0) {
        setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
      }
  }, [questionRemainingTime, matchState]);

  useEffect(() => {
    if (
      matchState === MatchState.READY &&
      playerState === PlayerState.READY &&
      hostState === HostState.ELECTED
    ) {
      setMatchState(MatchState.STARTED);
    }
  }, [matchState, playerState, hostState]);

  switch (matchState) {
    case MatchState.LOADING:
      return <>Loading...</>;
    case MatchState.READY:
      return (
        <div className="flex justify-center items-center">
          <h1>Ready</h1>
        </div>
      );
    case MatchState.STARTED:
      return (
        <div className="flex justify-center items-center">
          <div className="flex flex-col gap-2">
            <Question
              questionText={questions[currentQuestionIndex].question}
              allowedTimeInMS={questions[currentQuestionIndex].allowedTimeInMS}
              handleQuestionRemainingTime={setQuestionRemainingTime}
              isMatchStarted={true}
            />
          </div>
          <h1>Player</h1>
        </div>
      );
    case MatchState.ENDED:
      return <>Match ended</>;
    case MatchState.NOT_FOUND:
      return <>Match not found</>;
  }
  // if (hostState === HostState.NOT_ELECTED) return <>Looking for host...</>;
}
