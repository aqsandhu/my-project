import clsx from "clsx";
import { type HTMLAttributes } from "react";

type Props = {
	onClick: () => void;
} & Pick<HTMLAttributes<HTMLButtonElement>, "aria-controls">;

export const OpenButton = (props: Props) => {
	return (
		<button
			className={clsx(
				"flex h-8 w-8 flex-col items-center justify-center gap-1.5 self-end self-center rounded-md hover:bg-amber-700/20 transition-colors md:hidden",
			)}
			aria-controls={props["aria-controls"]}
			aria-expanded={false}
			aria-label="Open menu"
			onClick={props.onClick}
		>
			{/* Custom sword/knife themed hamburger menu with straight middle line */}
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="h-6 w-6 shrink-0"
				aria-hidden
			>
				<path d="M3 6h18" />
				<path d="M3 12h18" />
				<path d="M3 18h18" />
			</svg>
		</button>
	);
};
