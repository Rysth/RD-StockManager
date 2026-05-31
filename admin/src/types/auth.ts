export interface SignInForm {
	email: string;
	password: string;
}

export interface SignUpForm {
	fullName: string;
	username: string;
	email: string;
	password: string;
	passwordConfirmation: string;
}

export interface ConfirmForm {
	email: string;
}

export interface ForgotPasswordForm {
	email: string;
}

export interface ResetPasswordForm {
	password: string;
	passwordConfirmation: string;
}

export interface User {
	id: number;
	email: string;
	username: string;
	fullname: string;
	roles: string[];
	permissions: string[];
	verified: boolean;
	location_id?: number | null;
	location_name?: string | null;
	restricted_to_location?: boolean;
	created_at: string;
	updated_at: string;
}

// Permission constants (must match backend Permission model keys)
export const Permissions = {
	VIEW_DASHBOARD: "view_dashboard",
	VIEW_USERS: "view_users",
	CREATE_USERS: "create_users",
	EDIT_USERS: "edit_users",
	DELETE_USERS: "delete_users",
	EXPORT_USERS: "export_users",
	VIEW_BUSINESS: "view_business",
	EDIT_BUSINESS: "edit_business",
	EDIT_PROFILE: "edit_profile",
	VIEW_INVENTORY: "view_inventory",
	MANAGE_PRODUCTS: "manage_products",
	MANAGE_CUSTOMERS: "manage_customers",
	MANAGE_SALES: "manage_sales",
	VIEW_REPORTS: "view_reports",
	VIEW_LOCATIONS: "view_locations",
	MANAGE_LOCATIONS: "manage_locations",
	VIEW_PURCHASES: "view_purchases",
	MANAGE_PURCHASES: "manage_purchases",
	VIEW_EXPENSES: "view_expenses",
	MANAGE_EXPENSES: "manage_expenses",
} as const;

export type PermissionKey = (typeof Permissions)[keyof typeof Permissions];
