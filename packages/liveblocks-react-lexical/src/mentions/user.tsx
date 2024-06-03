import { useSharedContextBundle } from "@liveblocks/react";
import type { HTMLAttributes } from "react";
import React, { forwardRef } from "react";

export interface UserProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  userId: string;
}

export const User = forwardRef<HTMLSpanElement, UserProps>(
  function User(props, forwardedRef) {
    const { userId, ...spanProps } = props;
    const { useUser } = useSharedContextBundle();

    const { user, isLoading } = useUser(userId);

    const name = user === undefined || user === null ? "Anonymous" : user.name;

    return (
      <span
        data-loading={isLoading ? "" : undefined}
        {...spanProps}
        ref={forwardedRef}
      >
        {isLoading ? null : name}
      </span>
    );
  }
);
