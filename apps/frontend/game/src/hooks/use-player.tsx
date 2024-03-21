'use client';
import { useEffect } from 'react';
import { Presence } from '@heroiclabs/nakama-js';
import {
  PLAYER_COMMANDS,
  SOCKET_OP_CODES,
  SOCKET_SYNC,
} from '../components/match/match';
import { useAppDispatch, useAppSelector } from './use-redux-typed';
import {
  addPlayer,
  clearPlayers,
  PlayerScoreAction,
  PlayerState,
  removePlayer,
  setPlayerScore,
  setPlayerState,
} from '../store/features/playersSlice';
import { gameSocket } from '@kingo/game-client';
import { HostState } from './use-host';
import { subscribe } from '@kingo/events';

export interface Player {
  id: string;
  username: string;
  score: number;
  state: PlayerState;
}

export enum PLAYER_PRESENCE {
  JOINED = 'match_presence_joined',
  LEFT = 'match_presence_left',
}

export function usePlayer() {
  const match = useAppSelector((state) => state.match.currentMatch);
  const dispatch = useAppDispatch();
  const hostState = useAppSelector((state) => state.match.hostState);

  useEffect(() => {
    if (!match) return;

    match.presences.forEach((oldPlayer) => {
      dispatch(
        addPlayer({
          user_id: oldPlayer.user_id,
          username: oldPlayer.username,
          score: 0,
          state: PlayerState.READY,
        })
      );
    });
    dispatch(
      addPlayer({
        user_id: match.self.user_id,
        username: match.self.username,
        score: 0,
        state: PlayerState.READY,
      })
    );
  }, [dispatch, match]);

  // Cleanup
  useEffect(() => {
    return () => {
      dispatch(clearPlayers());
    };
  }, [dispatch]);

  subscribe('match_started', () => {
    dispatch(
      setPlayerState({
        user_id: match?.self.user_id,
        state: PlayerState.PLAYING,
      })
    );
  });

  subscribe(
    PLAYER_COMMANDS.SYNC_SCORE,
    (playerScore: {
      user_id: string;
      points: number;
      action: PlayerScoreAction;
    }) => {
      dispatch(setPlayerScore(playerScore));
      gameSocket.sendMatchState(
        match?.match_id,
        SOCKET_OP_CODES.PLAYERS_SCORE,
        JSON.stringify(playerScore)
      );
    }
  );

  subscribe(SOCKET_SYNC.PLAYER_SCORE, (decodedData: string) => {
    dispatch(
      setPlayerScore(new PlayerScoreMessageDTO(JSON.parse(decodedData)))
    );
  });

  subscribe(PLAYER_PRESENCE.JOINED, (player: PlayerPresenceMessageDTO) => {
    if (hostState === HostState.ELECTED) {
      dispatch(
        addPlayer({
          user_id: player.user_id,
          username: player.username,
          score: 0,
          state: PlayerState.READY,
        })
      );
    }
  });

  subscribe(PLAYER_PRESENCE.LEFT, (player: Presence) => {
    dispatch(removePlayer(player.user_id));
  });
}
export function objectToUint8Array(obj: Record<string, unknown>): Uint8Array {
  const jsonString = JSON.stringify(obj);
  const encoder = new TextEncoder();
  return encoder.encode(jsonString);
}

export function uint8ArrayToObject(
  uint8Array: Uint8Array
): Record<string, unknown> {
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(uint8Array);
  return JSON.parse(jsonString);
}

interface IPlayerScoreMessageDTO {
  id: string;
  username: string;
  points: number;
  action: PlayerScoreAction;
}
export class PlayerScoreMessageDTO {
  user_id: string;
  username: string;
  points: number;
  action: PlayerScoreAction;

  constructor(obj: IPlayerScoreMessageDTO) {
    Object.assign(this, obj);
  }

  public toUint8Array(): Uint8Array {
    return objectToUint8Array({
      id: this.user_id,
      username: this.username,
      points: this.points,
      action: this.action,
    });
  }
}

export class PlayerPresenceMessageDTO
  implements Pick<Presence, 'username' | 'user_id'>
{
  user_id: string;
  username: string;

  constructor(obj: { user_id: string; username: string }) {
    Object.assign(this, obj);
  }
}
