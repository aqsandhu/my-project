import clsx from "clsx";
import { type HTMLAttributes } from "react";

type Props = {
	onClick: () => void;
} & Pick<HTMLAttributes<HTMLButtonElement>, "aria-controls">;

export const CloseButton = (props: Props) => {
	return (
		<button
			className={clsx(
				"top-0 ml-auto flex h-8 w-8 flex-col items-center justify-center gap-1.5 self-end self-center rounded-md hover:bg-amber-700/20 transition-colors md:hidden",
			)}
			aria-controls={props["aria-controls"]}
			aria-expanded={true}
			aria-label="Close menu"
			onClick={props.onClick}
		>
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
				<path d="M18 6L6 18" />
				<path d="M6 6l12 12" />
				<path d="M12 6v12" />
			</svg>
		</button>
	);
};
