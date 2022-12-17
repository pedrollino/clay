/**
 * SPDX-FileCopyrightText: © 2022 Liferay, Inc. <https://liferay.com>
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
	InternalDispatch,
	Keys,
	Overlay,
	getFocusableList,
	isTypeahead,
	useId,
	useInteractionFocus,
	useInternalState,
	useIsMobileDevice,
	useNavigation,
	useOverlayPosition,
} from '@clayui/shared';
import classNames from 'classnames';
import React, {useCallback, useRef, useState} from 'react';

import {Collection, useCollection} from '../collection';
import {PickerContext} from './context';

import type {ICollectionProps} from '../collection';

export type Props<T> = {
	/**
	 * Flag to indicate if the DropDown menu is active or not (controlled).
	 */
	active?: boolean;

	/**
	 * The `aria-label` attribute defines a string value that labels an interactive
	 * element.
	 */
	'aria-label'?: string;

	/**
	 * The `aria-labelledby` attribute identifies the element (or elements) that
	 * labels the element it is applied to.
	 */
	'aria-labelledby'?: string;

	/**
	 * Custom trigger component.
	 */
	as?:
		| 'button'
		| React.ForwardRefExoticComponent<any>
		| ((props: React.HTMLAttributes<HTMLElement>) => JSX.Element);

	/**
	 * Sets the CSS className for the component.
	 */
	className?: string;

	/**
	 *  Property to set the default value of `active` (uncontrolled).
	 */
	defaultActive?: boolean;

	/**
	 * The initial selected key (uncontrolled).
	 */
	defaultSelectedKey?: React.Key;

	/**
	 * Direction the menu will render relative to the Picker.
	 */
	direction?: 'bottom' | 'top';

	/**
	 * Flag to indicate that the component is disabled.
	 */
	disabled?: boolean;

	/**
	 * The id of the component.
	 */
	id?: string;

	/**
	 * Flag to make the component hybrid, when identified it is on a mobile
	 * device it will use the native selector.
	 */
	native?: boolean;

	/**
	 * Callback for when the active state changes (controlled).
	 */
	onActiveChange?: InternalDispatch<boolean>;

	/**
	 * Callback calling when an option is selected.
	 */
	onSelectionChange?: InternalDispatch<React.Key>;

	/**
	 * Text that appears when you don't have an item selected.
	 */
	placeholder?: string;

	/**
	 * The currently selected key (controlled).
	 */
	selectedKey?: React.Key;
} & Omit<ICollectionProps<T, unknown>, 'virtualize'>;

export function Picker<T>({
	active: externalActive,
	as: As = 'button',
	children,
	className,
	defaultActive = false,
	defaultSelectedKey,
	direction = 'bottom',
	disabled,
	id,
	items,
	native = false,
	onActiveChange,
	onSelectionChange,
	placeholder = 'Select an option',
	selectedKey: externalSelectedKey,
	...otherProps
}: Props<T>) {
	const [active, setActive] = useInternalState({
		defaultName: 'defaultActive',
		defaultValue: defaultActive,
		handleName: 'onActiveChange',
		name: 'active',
		onChange: onActiveChange,
		value: externalActive,
	});

	const [selectedKey, setSelectedKey] = useInternalState({
		defaultName: 'defaultSelectedKey',
		defaultValue: defaultSelectedKey,
		handleName: 'onSelectionChange',
		name: 'selectedKey',
		onChange: onSelectionChange,
		value: externalSelectedKey,
	});

	// We initialize the collection in the picker and then pass it down so the
	// collection can be cached even before the listbox is not mounted.
	const collection = useCollection<T, unknown>({
		children,
		items,
		suppressTextValueWarning: false,
	});

	const [activeDescendant, setActiveDescendant] = useState(() =>
		typeof selectedKey !== 'undefined'
			? String(selectedKey)
			: collection.getFirstItem().key
	);

	const ariaControls = useId();
	const ariaOwns = useId();

	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);

	const {isFocusVisible} = useInteractionFocus();

	useOverlayPosition(
		{
			alignmentByViewport: true,
			alignmentPosition: direction === 'bottom' ? 5 : 7,
			autoBestAlign: true,
			isOpen: active,
			ref: menuRef,
			triggerRef,
		},
		[active, children]
	);

	const isMobile = useIsMobileDevice();

	const {accessibilityFocus, navigationProps} = useNavigation({
		activation: 'manual',
		active: activeDescendant,
		containerRef: menuRef,
		onNavigate: (tab) => setActiveDescendant(tab.getAttribute('id')!),
		orientation: 'vertical',
		typeahead: true,
		visible: active,
	});

	const onPress = useCallback(() => {
		if (menuRef.current && activeDescendant) {
			const item = menuRef.current.querySelector<HTMLButtonElement>(
				`#${activeDescendant}`
			);

			if (item) {
				item.click();
			}
		}
	}, [activeDescendant]);

	const context = {
		activeDescendant,
		isMobile: isMobile && native,
		onActiveDescendant: setActiveDescendant,
		onSelectionChange: (key: React.Key) => {
			triggerRef.current!.focus();
			setActiveDescendant(String(key));
			setSelectedKey(key);
			setActive(false);
		},
		selectedKey,
	};

	if (context.isMobile) {
		return (
			<select
				{...otherProps}
				className={classNames(
					'form-control form-control-select form-control-select-secondary',
					className
				)}
				onChange={(event) => setSelectedKey(event.target.value)}
				value={selectedKey}
			>
				<PickerContext.Provider value={context}>
					<Collection<T> collection={collection} />
				</PickerContext.Provider>
			</select>
		);
	}

	return (
		<>
			<As
				{...otherProps}
				aria-activedescendant={active ? activeDescendant : ''}
				aria-controls={active ? ariaControls : undefined}
				aria-expanded={active}
				aria-haspopup="listbox"
				aria-owns={active ? ariaOwns : undefined}
				className={classNames(
					'form-control form-control-select form-control-select-secondary',
					className,
					{
						show: active,
					}
				)}
				disabled={disabled}
				id={id}
				onClick={() => setActive(!active)}
				onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => {
					switch (event.key) {
						case Keys.Enter:
						case Keys.Spacebar: {
							event.preventDefault();
							setActive(true);

							if (active && activeDescendant) {
								onPress();
							}
							break;
						}
						case Keys.Tab:
							onPress();
							break;
						case Keys.Home:
						case Keys.End: {
							if (!active) {
								setActive(true);
							}
							navigationProps.onKeyDown(event);
							break;
						}
						case Keys.Up:
						case Keys.Down: {
							if (
								active &&
								event.altKey &&
								event.key === Keys.Up
							) {
								event.stopPropagation();
								onPress();
								setActive(false);

								return;
							}

							if (!active) {
								return setActive(true);
							}

							navigationProps.onKeyDown(event);
							break;
						}
						case 'PageUp':
						case 'PageDown': {
							if (!active) {
								return;
							}

							event.preventDefault();

							const list = getFocusableList(menuRef);

							const position = list.findIndex(
								(element) =>
									element.getAttribute('id') ===
									activeDescendant
							);

							if (position === -1) {
								break;
							}

							const option =
								list[
									event.key === 'PageUp'
										? position - 10
										: position + 10
								] ??
								list[
									event.key === 'PageUp' ? 0 : list.length - 1
								];

							accessibilityFocus(option);
							break;
						}
						default: {
							if (isTypeahead(event)) {
								setActive(true);
							}

							navigationProps.onKeyDown(event);
							break;
						}
					}
				}}
				ref={triggerRef}
				role="combobox"
			>
				{selectedKey ? collection.getItem(selectedKey) : placeholder}
			</As>

			{active && (
				<Overlay
					isCloseOnInteractOutside
					isKeyboardDismiss
					isOpen
					menuRef={menuRef}
					onClose={(action) => {
						if (
							isFocusVisible() &&
							activeDescendant &&
							action === 'blur'
						) {
							onPress();
						} else {
							const key =
								String(selectedKey) === 'undefined'
									? collection.getFirstItem().key
									: String(selectedKey);

							if (key !== activeDescendant) {
								setActiveDescendant(key);
							}
						}

						setActive(false);
					}}
					portalRef={menuRef}
					suppress={[triggerRef, menuRef]}
					triggerRef={triggerRef}
				>
					<div
						className="dropdown-menu dropdown-menu-indicator-start dropdown-menu-select show"
						id={ariaControls}
						onFocus={() => triggerRef.current?.focus()}
						ref={menuRef}
						role="presentation"
					>
						<ul
							aria-labelledby={otherProps['aria-labelledby']}
							className="inline-scroller list-unstyled"
							id={ariaOwns}
							role="listbox"
							tabIndex={-1}
						>
							<PickerContext.Provider value={context}>
								<Collection<T> collection={collection} />
							</PickerContext.Provider>
						</ul>
					</div>
				</Overlay>
			)}
		</>
	);
}