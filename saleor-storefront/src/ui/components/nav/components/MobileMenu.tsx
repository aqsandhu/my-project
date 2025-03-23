"use client";

import { Fragment, type ReactNode } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Logo } from "../../Logo";
import { useMobileMenu } from "./useMobileMenu";
import { OpenButton } from "./OpenButton";
import { CloseButton } from "./CloseButton";

type Props = {
	children: ReactNode;
};

export const MobileMenu = ({ children }: Props) => {
	const { closeMenu, openMenu, isOpen } = useMobileMenu();

	return (
		<>
			<OpenButton onClick={openMenu} aria-controls="mobile-menu" />
			<Transition show={isOpen}>
				<Dialog onClose={closeMenu}>
					<Dialog.Panel className="fixed inset-0 z-20 flex h-dvh w-screen flex-col overflow-y-scroll bg-black/50">
						<div className="mx-auto w-[80%] max-w-md">
							<Transition.Child
								className="sticky top-0 z-10 flex h-16 shrink-0 bg-blue-950 px-3 backdrop-blur-md sm:px-8"
								enter="motion-safe:transition-all motion-safe:duration-150"
								enterFrom="translate-y-[-100%]"
								enterTo="translate-y-0"
								leave="motion-safe:transition-all motion-safe:duration-150"
								leaveFrom="translate-y-0"
								leaveTo="translate-y-[-100%]"
							>
								<Logo />
								<CloseButton onClick={closeMenu} aria-controls="mobile-menu" />
							</Transition.Child>
							<Transition.Child
								as={Fragment}
								enter="motion-safe:transition-all motion-safe:duration-150"
								enterFrom="opacity-0 -translate-y-3"
								enterTo="opacity-100 translate-y-0"
								leave="motion-safe:transition-all motion-safe:duration-150"
								leaveFrom="opacity-100 translate-y-0"
								leaveTo="opacity-0 -translate-y-3"
							>
								<ul
									className="flex h-full flex-col divide-y divide-amber-800/30 whitespace-nowrap p-3 pt-0 sm:p-8 sm:pt-0 [&>li]:py-3 bg-[#241505] rounded-b-lg"
									id="mobile-menu"
								>
									{children}
								</ul>
							</Transition.Child>
						</div>
					</Dialog.Panel>
				</Dialog>
			</Transition>
		</>
	);
};
