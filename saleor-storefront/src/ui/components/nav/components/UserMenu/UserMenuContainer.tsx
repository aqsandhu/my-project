import { UserIcon } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { CurrentUserDocument } from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";

export async function UserMenuContainer() {
	const { me: user } = await executeGraphQL(CurrentUserDocument, {
		cache: "no-cache",
	});

	if (user) {
		return <UserMenu user={user} />;
	} else {
		return (
			<LinkWithChannel href="/account/login" className="ml-2 flex-shrink-0">
				<UserIcon className="h-7 w-7 shrink-0" aria-hidden="true" />
				<span className="sr-only">Log in</span>
			</LinkWithChannel>
		);
	}
}
