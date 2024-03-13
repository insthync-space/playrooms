'use client';
import { gameSocket } from '@core/game-client';
import { usePubSub } from './use-pub-sub';
import { QuestionsFinishedEventKey } from './use-questions';
import { useAppDispatch, useAppSelector } from './use-redux-typed';
import {
  MatchState,
  setCurrentMatch,
  setCurrentMatchState,
} from '../store/features/matchSlice';
import { MatchOpCodes } from '../components/match/match';
import { HostEventsKey, HostState } from './use-host';
import { PlayerState } from '../store/features/playerSlice';
import { useSafeSocket } from './use-safe-socket';
import { useEffect } from 'react';

export const MatchStateEventsKey = 'match_events';

export interface JoinMatchProps {
  matchId?: string;
  ticket?: string;
  token?: string;
}
export function useMatch({
  stateHandler,
  matchId,
}: {
  stateHandler?: () => void;
  matchId?: string;
}) {
  const { publish, subscribe } = usePubSub();
  const { use } = useSafeSocket();
  const match = useAppSelector((state) => state.match.currentMatch);
  const playerState = useAppSelector((state) => state.player.myPlayerState);
  const socket = useAppSelector((state) => state.socket);
  const dispatch = useAppDispatch();

  stateHandler && stateHandler();

  // Cleanup
  // useEffect(() => {
  //   return () => {
  //     match &&
  //       gameSocket
  //         .leaveMatch(match.match_id)
  //         .then(() => dispatch(setCurrentMatch(null)));
  //   };
  // }, [dispatch, match]);

  // Create a flag to track whether the joinMatch function has been called
  useEffect(() => {
    if (matchId) joinMatch({ matchId });
  }, [matchId]);

  const joinMatch = ({ matchId, ticket, token }: JoinMatchProps) => {
    if (playerState === PlayerState.PLAYING) {
      console.log('Player is playing');
      return;
    }

    if (match) {
      console.log('Player already in match');
      return;
    }

    if (!matchId && !ticket) {
      console.log('matchId or ticket needed to join match, received:', {
        matchId,
        ticket,
      });
      return;
    }

    console.log('Joining match', matchId || ticket);
    gameSocket
      .joinMatch(matchId || ticket, token)
      .then((match) => {
        publish('match_joined', true);
        console.log('Joined match', match);
        dispatch(setCurrentMatch(match));
      })
      .catch((error) => {
        publish('match_joined', false);
        console.error('Error joining match', error);
      });
  };

  return {
    createMatch: async (name: string) => {
      try {
        const match = await gameSocket.createMatch(name);
        publish('match_created', true);
        return match;
      } catch (error) {
        console.error('Error creating match', error);
      }
    },
    joinMatch,
  };
}

export const useMatchState = () => {
  const { subscribe, publish } = usePubSub();
  const dispatch = useAppDispatch();

  const matchSate = useAppSelector((state) => state.match.currentMatchState);
  const amIHost = useAppSelector((state) => state.match.amIHost);
  const hostState = useAppSelector((state) => state.match.hostState);
  const playerState = useAppSelector((state) => state.player.myPlayerState);
  const match = useAppSelector((state) => state.match.currentMatch);

  const didMatchStart = matchSate === MatchState.STARTED;
  const didMatchEnd = matchSate === MatchState.ENDED;
  const isMatchReady = matchSate === MatchState.READY;
  const isMatchNotFount = matchSate === MatchState.NOT_FOUND;
  const isPlayerReady = playerState === PlayerState.READY;
  const isHostElected = hostState === HostState.ELECTED;

  useEffect(() => {
    if (isPlayerReady && isHostElected && !didMatchStart)
      syncMatchState(MatchState.READY);
  }, [isPlayerReady, isHostElected]);

  subscribe({
    event: 'host_requested_start',
    callback: () => {
      console.log('isMatchReady', isMatchReady);
      console.log('Host requested start');
      if (isMatchReady) syncMatchState(MatchState.STARTED);
      else {
        console.log('isMatchReady', isMatchReady);
        console.log('isPlayerReady', isPlayerReady);
        console.log('isHostElected', isHostElected);
      }
    },
  });

  subscribe({
    event: 'match_created',
    callback: () => syncMatchState(MatchState.LOADING),
  });

  subscribe({
    event: 'match_joined',
    callback: (isJoined: boolean) => {
      isJoined
        ? syncMatchState(MatchState.LOADING)
        : syncMatchState(MatchState.NOT_FOUND);
    },
  });

  subscribe({
    event: MatchStateEventsKey,
    callback: (newMatchState: MatchState) => syncMatchState(newMatchState),
  });
  // subscribe({
  //   event: PlayerStateEventsKey,
  //   callback: (playerState: PlayerState) => {
  //     if (playerState === PlayerState.NOT_READY && didMatchStart)
  //       syncMatchState(MatchState.PAUSED);
  //   },
  // });

  subscribe({
    event: HostEventsKey,
    callback: (hostState: HostState) => {
      if (hostState === HostState.NOT_ELECTED && didMatchStart) {
        syncMatchState(MatchState.PAUSED);
      }
    },
  });

  subscribe({
    event: QuestionsFinishedEventKey,
    callback: () => syncMatchState(MatchState.ENDED),
  });

  function syncMatchState(newMatchState: MatchState) {
    if (didMatchEnd || isMatchNotFount) return;
    if (newMatchState === MatchState.STARTED) {
      console.log('Match started');
      console.log('amIHost', amIHost);
      publish('match_started', true);
    }
    dispatch(setCurrentMatchState(newMatchState));
    amIHost &&
      gameSocket.sendMatchState(
        match?.match_id,
        MatchOpCodes.MATCH_STATE,
        newMatchState
      );
  }
};

export const createMatchEventKey = 'createMatch';
