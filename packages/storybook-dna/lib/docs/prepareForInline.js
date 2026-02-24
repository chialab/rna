/**
 * @import { PartialStoryFn } from 'storybook/internal/types'
 */
import { render } from '@chialab/dna';
import React from 'react';

/**
 * @param {PartialStoryFn<any>} storyFn
 */
export const prepareForInline = (storyFn) => {
    class Story extends React.Component {
        wrapperRef = React.createRef();

        componentDidMount() {
            render(storyFn(), /** @type {Element} */ (this.wrapperRef.current));
        }

        render() {
            return React.createElement('div', {
                ref: this.wrapperRef,
            });
        }
    }

    return React.createElement(Story);
};
